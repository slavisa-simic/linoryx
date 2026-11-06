package com.linoryx.api.incident.services;

import com.linoryx.api.audit.domain.AuditAction;
import com.linoryx.api.audit.service.AuditService;
import com.linoryx.api.exception.ResourceNotFoundException;
import com.linoryx.api.incident.domain.*;
import com.linoryx.api.incident.dto.*;
import com.linoryx.api.incident.repository.IncidentRepository;
import com.linoryx.api.notification.NotificationService;
import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.dto.IncidentReportCount;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.user.domain.*;
import com.linoryx.api.user.service.UserService;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IncidentService {
    private final IncidentRepository incidents;
    private final CustomerReportRepository reports;
    private final UserService users;
    private final AuditService audit;
    private final NotificationService notifications;

    public IncidentService(IncidentRepository incidents, CustomerReportRepository reports, UserService users,
                           AuditService audit, NotificationService notifications) {
        this.incidents = incidents;
        this.reports = reports;
        this.users = users;
        this.audit = audit;
        this.notifications = notifications;
    }

    @Transactional
    public IncidentResponse createIncident(CreateIncidentRequest request, String email) {
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        List<CustomerReport> selected = lockEligibleReports(request.reportIds());
        Incident incident = incidents.save(new Incident(request.title().trim(), request.description().trim(),
                request.severity(), request.category(), actor));
        audit.log(incident, actor, AuditAction.CREATED);
        linkReports(incident, selected, actor);
        notifications.processIncidentAlerts(incident);
        return response(incident, selected.size(), 0);
    }

    @Transactional
    public IncidentResponse attachReports(Long id, List<Long> reportIds, String email) {
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        Incident incident = lockIncident(id);
        incident.requireCurrentWorkflow();
        if (incident.getStatus() == IncidentStatus.CLOSED) {
            throw new IllegalStateException("Reports cannot be attached to a closed incident.");
        }
        linkReports(incident, lockEligibleReports(reportIds), actor);
        return responseWithCounts(incident);
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> getAllIncidents(IncidentStatus status, Severity severity, IncidentCategory category,
                                                 String search, String email, Pageable pageable) {
        User actor = users.getActiveUser(email);
        requireStaff(actor);
        Long technicianId = null;
        if (actor.getRole() == UserRole.TECHNICIAN) {
            technicianId = actor.getId();
        }
        String searchText = null;
        if (search != null && !search.isBlank()) {
            searchText = search.trim();
        }
        Page<Incident> page = incidents.findVisibleIncidents(technicianId, null, status, severity, category, searchText, pageable);
        List<Long> ids = new ArrayList<>();
        for (Incident incident : page) {
            ids.add(incident.getId());
        }
        Map<Long, IncidentReportCount> counts = counts(ids);
        return page.map(incident -> {
            IncidentReportCount count = counts.getOrDefault(incident.getId(), new IncidentReportCount(incident.getId(), 0, 0));
            return response(incident, count.total(), count.closed());
        });
    }

    @Transactional(readOnly = true)
    public IncidentResponse getIncident(Long id, String email) {
        User actor = users.getActiveUser(email);
        Incident incident = incidents.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found."));
        requireStaff(actor);
        if (actor.getRole() == UserRole.TECHNICIAN) {
            boolean historicalAssignment = incident.isLegacy() && incident.getAssignedTo() != null
                    && incident.getAssignedTo().getId().equals(actor.getId());
            if (!historicalAssignment && !reports.existsByIncidentIdAndAssignedTechnicianId(id, actor.getId())) {
                throw new AccessDeniedException("You can only read incidents containing your assigned reports.");
            }
        }
        return responseWithCounts(incident);
    }

    @Transactional
    public IncidentResponse changeCategory(Long id, IncidentCategory category, String email) {
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        Incident incident = lockIncident(id);
        incident.requireCurrentWorkflow();
        if (incident.getCategory() != category) {
            incident.changeCategory(category);
            audit.log(incident, actor, AuditAction.CATEGORY_CHANGED);
        }
        return responseWithCounts(incident);
    }

    @Transactional
    public IncidentResponse startProgress(Long id, String email) {
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        Incident incident = lockIncident(id);
        incident.startProgress();
        audit.log(incident, actor, AuditAction.STARTED);
        return responseWithCounts(incident);
    }

    @Transactional
    public IncidentResponse closeIncident(Long id, String email) {
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        Incident incident = lockIncident(id);
        incident.requireCurrentWorkflow();
        if (incident.getStatus() != IncidentStatus.IN_PROGRESS || !reports.existsByIncidentId(id)
                || reports.existsByIncidentIdAndStatusNot(id, ReportStatus.CLOSED)) {
            throw new IllegalStateException("Start the incident and close every associated report before closing it.");
        }
        incident.close();
        audit.log(incident, actor, AuditAction.CLOSED);
        return responseWithCounts(incident);
    }

    private Incident lockIncident(Long id) {
        return incidents.findForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Incident not found."));
    }

    private List<CustomerReport> lockEligibleReports(List<Long> ids) {
        if (ids == null || ids.isEmpty() || new HashSet<>(ids).size() != ids.size()) {
            throw new IllegalArgumentException("Select at least one report, without duplicates.");
        }
        for (Long id : ids) {
            if (id == null || id <= 0) throw new IllegalArgumentException("Report IDs must be positive numbers.");
        }
        List<Long> sortedIds = new ArrayList<>(ids);
        Collections.sort(sortedIds);
        List<CustomerReport> selected = new ArrayList<>();
        // A stable order avoids deadlocks when dispatchers select overlapping reports.
        for (Long id : sortedIds) {
            CustomerReport report = reports.findForUpdate(id)
                    .orElseThrow(() -> new ResourceNotFoundException("Report REP-" + id + " not found."));
            if (report.getIncident() != null || report.getStatus() == ReportStatus.CLOSED) {
                throw new IllegalStateException("Report REP-" + id + " is already linked or closed.");
            }
            selected.add(report);
        }
        return selected;
    }

    private void linkReports(Incident incident, List<CustomerReport> selected, User actor) {
        for (CustomerReport report : selected) {
            report.linkTo(incident);
            audit.logReport(report, actor, AuditAction.REPORT_LINKED);
        }
    }

    private void requireOperator(User actor) {
        if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.DISPATCHER) {
            throw new AccessDeniedException("Only dispatchers and administrators can manage incidents.");
        }
    }

    private void requireStaff(User actor) {
        if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.DISPATCHER
                && actor.getRole() != UserRole.TECHNICIAN) {
            throw new AccessDeniedException("Incidents are internal. View your customer reports instead.");
        }
    }

    private Map<Long, IncidentReportCount> counts(List<Long> ids) {
        Map<Long, IncidentReportCount> result = new HashMap<>();
        if (!ids.isEmpty()) {
            for (IncidentReportCount count : reports.countForIncidents(ids)) {
                result.put(count.incidentId(), count);
            }
        }
        return result;
    }

    private IncidentResponse responseWithCounts(Incident incident) {
        IncidentReportCount count = counts(List.of(incident.getId()))
                .getOrDefault(incident.getId(), new IncidentReportCount(incident.getId(), 0, 0));
        return response(incident, count.total(), count.closed());
    }

    private IncidentResponse response(Incident incident, long total, long closed) {
        Long technicianId = null;
        String technicianEmail = null;
        if (incident.getAssignedTo() != null) {
            technicianId = incident.getAssignedTo().getId();
            technicianEmail = incident.getAssignedTo().getEmail();
        }
        return new IncidentResponse(incident.getId(), incident.getTitle(), incident.getDescription(),
                incident.getSeverity(), incident.getStatus(), incident.getCategory(),
                incident.getCreatedBy().getId(), incident.getCreatedBy().getEmail(), technicianId, technicianEmail,
                incident.getCreatedAt(), incident.getUpdatedAt(), incident.getResolvedAt(), incident.getClosedAt(),
                incident.isLegacy(), incident.getLegacyStatus(), total, closed);
    }
}
