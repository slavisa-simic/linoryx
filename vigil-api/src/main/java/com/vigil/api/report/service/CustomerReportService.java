package com.vigil.api.report.service;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.customerservice.domain.*;
import com.vigil.api.customerservice.repository.CustomerServiceRepository;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.incident.domain.*;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.report.domain.*;
import com.vigil.api.report.dto.*;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import com.vigil.api.technician.domain.TechnicianAvailability;
import com.vigil.api.technician.domain.TechnicianProfile;
import com.vigil.api.technician.repository.TechnicianProfileRepository;
import java.util.Objects;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerReportService {
    private final CustomerReportRepository reports;
    private final CustomerServiceRepository services;
    private final IncidentRepository incidents;
    private final UserRepository userRepository;
    private final UserService users;
    private final AuditService audit;
    private final TechnicianProfileRepository profiles;

    public CustomerReportService(CustomerReportRepository reports, CustomerServiceRepository services,
                                 IncidentRepository incidents, UserRepository userRepository,
                                 UserService users, AuditService audit, TechnicianProfileRepository profiles) {
        this.reports = reports;
        this.services = services;
        this.incidents = incidents;
        this.userRepository = userRepository;
        this.users = users;
        this.audit = audit;
        this.profiles = profiles;
    }

    @Transactional
    public ReportResponse create(CreateReportRequest request, String email) {
        User actor = users.getActiveUser(email);
        requireRole(actor, UserRole.USER);
        CustomerService service = services.findById(request.customerServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer service not found."));
        if (!service.getCustomer().getId().equals(actor.getId())) {
            throw new AccessDeniedException("You can only report problems with your own services.");
        }
        if (service.getStatus() != ServiceStatus.ACTIVE) {
            throw new IllegalStateException("Only active services can be reported.");
        }
        CustomerReport report = reports.save(new CustomerReport(service, request.category(), request.description()));
        audit.logReport(report, actor, AuditAction.REPORT_CREATED);
        return toResponse(report, actor);
    }

    @Transactional(readOnly = true)
    public Page<ReportResponse> list(String email, String scope, Long incidentId,
                                     ReportStatus status, ReportCategory category, Pageable pageable) {
        User actor = users.getActiveUser(email);
        Long customerId = null;
        Long technicianId = null;
        if ("my".equals(scope)) {
            requireRole(actor, UserRole.USER);
            customerId = actor.getId();
        } else if ("assigned".equals(scope)) {
            requireRole(actor, UserRole.TECHNICIAN);
            technicianId = actor.getId();
        } else {
            requireOperator(actor);
        }
        return reports.findVisible(customerId, technicianId, incidentId, status, category, pageable)
                .map(report -> toResponse(report, actor));
    }

    @Transactional
    public ReportResponse assign(Long id, Long technicianId, String email) {
        // Account management uses this same lock before disabling or changing a technician's role.
        userRepository.findByRoleOrderByIdAsc(UserRole.ADMIN);
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        User technician = userRepository.findForUpdate(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found."));
        if (technician.getRole() != UserRole.TECHNICIAN || !technician.isEnabled()) {
            throw new IllegalArgumentException("Choose an active TECHNICIAN account.");
        }
        Optional<TechnicianProfile> profile = profiles.findByUserId(technicianId);
        if (profile.isEmpty() || profile.get().getAvailability() != TechnicianAvailability.AVAILABLE) {
            throw new IllegalStateException("Choose a technician whose availability is AVAILABLE. BUSY, OFF_DUTY and unconfigured technicians cannot be assigned.");
        }
        CustomerReport report = lockReport(id);
        report.assignTo(technician);
        audit.logReport(report, actor, AuditAction.REPORT_ASSIGNED);
        return toResponse(report, actor);
    }

    @Transactional
    public ReportResponse start(Long id, String email) {
        User actor = users.getActiveUser(email);
        CustomerReport report = lockReport(id);
        requireAssignedTechnician(report, actor);
        requireIncidentInProgress(report);
        report.start();
        audit.logReport(report, actor, AuditAction.REPORT_STARTED);
        return toResponse(report, actor);
    }

    @Transactional
    public ReportResponse resolve(Long id, String email) {
        User actor = users.getActiveUser(email);
        CustomerReport report = lockReport(id);
        requireAssignedTechnician(report, actor);
        requireIncidentInProgress(report);
        report.resolve();
        audit.logReport(report, actor, AuditAction.REPORT_RESOLVED);
        return toResponse(report, actor);
    }

    @Transactional
    public ReportResponse confirmFixed(Long id, String email) {
        User actor = users.getActiveUser(email);
        CustomerReport report = lockReport(id);
        requireOwner(report, actor);
        report.confirmFixed();
        audit.logReport(report, actor, AuditAction.CUSTOMER_CONFIRMED);
        return toResponse(report, actor);
    }

    @Transactional
    public ReportResponse stillNotWorking(Long id, String email) {
        User actor = users.getActiveUser(email);
        CustomerReport report = lockReport(id);
        requireOwner(report, actor);
        requireIncidentInProgress(report);
        report.stillNotWorking();
        // The report's IN_PROGRESS status is visible in both dispatcher and technician queues.
        audit.logReport(report, actor, AuditAction.CUSTOMER_STILL_NOT_WORKING);
        return toResponse(report, actor);
    }

    @Transactional
    public ReportResponse close(Long id, String email) {
        User actor = users.getActiveUser(email);
        requireOperator(actor);
        CustomerReport report = lockReport(id);
        report.close();
        audit.logReport(report, actor, AuditAction.REPORT_CLOSED);
        return toResponse(report, actor);
    }

    private CustomerReport lockReport(Long id) {
        // Always lock the incident first, then the report. Closure uses the same incident lock.
        Long incidentId = reports.findIncidentId(id);
        if (incidentId != null) {
            Incident incident = incidents.findForUpdate(incidentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Incident not found."));
            if (incident.getStatus() == IncidentStatus.CLOSED || incident.isLegacy()) {
                throw new IllegalStateException("This incident is closed or historical and cannot be changed.");
            }
        }
        CustomerReport report = reports.findForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found."));
        Long currentIncidentId = null;
        if (report.getIncident() != null) {
            currentIncidentId = report.getIncident().getId();
        }
        if (!Objects.equals(incidentId, currentIncidentId)) {
            throw new IllegalStateException("The report was linked while you were working. Refresh and try again.");
        }
        return report;
    }

    private void requireIncidentInProgress(CustomerReport report) {
        if (report.getIncident() == null || report.getIncident().getStatus() != IncidentStatus.IN_PROGRESS) {
            throw new IllegalStateException("Start the linked incident before working on this report.");
        }
    }

    private void requireAssignedTechnician(CustomerReport report, User actor) {
        requireRole(actor, UserRole.TECHNICIAN);
        if (report.getAssignedTechnician() == null || !report.getAssignedTechnician().getId().equals(actor.getId())) {
            throw new AccessDeniedException("This report is not assigned to you.");
        }
    }

    private void requireOwner(CustomerReport report, User actor) {
        requireRole(actor, UserRole.USER);
        if (!report.getCustomerService().getCustomer().getId().equals(actor.getId())) {
            throw new AccessDeniedException("You can only confirm your own reports.");
        }
    }

    private void requireRole(User actor, UserRole role) {
        if (actor.getRole() != role) {
            throw new AccessDeniedException("This action requires the " + role + " role.");
        }
    }

    private void requireOperator(User actor) {
        if (actor.getRole() != UserRole.DISPATCHER && actor.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only dispatchers and administrators can manage reports.");
        }
    }

    private ReportResponse toResponse(CustomerReport report, User actor) {
        CustomerService service = report.getCustomerService();
        User customer = service.getCustomer();
        Long customerId = null;
        String customerName = null;
        String customerEmail = null;
        String nodeCode = null;
        String nodeName = null;
        Long technicianId = null;
        String technicianName = null;
        Long incidentId = null;
        String incidentTitle = null;
        IncidentStatus incidentStatus = null;
        if (actor.getRole() != UserRole.USER) {
            customerId = customer.getId();
            customerName = customer.getFirstName() + " " + customer.getLastName();
            customerEmail = customer.getEmail();
            if (actor.getRole() != UserRole.TECHNICIAN) {
                nodeCode = service.getNetworkNode().getCode();
                nodeName = service.getNetworkNode().getName();
            }
            User technician = report.getAssignedTechnician();
            if (technician != null) {
                technicianId = technician.getId();
                technicianName = technician.getFirstName() + " " + technician.getLastName();
            }
            if (report.getIncident() != null) {
                incidentId = report.getIncident().getId();
                incidentTitle = report.getIncident().getTitle();
                incidentStatus = report.getIncident().getStatus();
            }
        }
        return new ReportResponse(report.getId(), service.getId(), service.getServiceType(),
                service.getServiceLocation().getFormattedAddress(), report.getCategory(), report.getDescription(),
                report.getStatus(), report.isUserConfirmed(), report.isCustomerReportedUnfixed(), report.getCreatedAt(), report.getUpdatedAt(),
                report.getResolvedAt(), report.getClosedAt(), customerId, customerName, customerEmail,
                nodeCode, nodeName, technicianId, technicianName, incidentId, incidentTitle, incidentStatus);
    }
}
