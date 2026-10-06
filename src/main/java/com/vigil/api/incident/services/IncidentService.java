package com.vigil.api.incident.services;


import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.dto.IncidentResponse;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.notification.NotificationService;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import com.vigil.api.user.domain.UserRole;

@Service
public class IncidentService {
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public IncidentService(
            IncidentRepository incidentRepository,
            UserRepository userRepository,
            AuditService auditService,
            NotificationService notificationService
    ){
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional
    public IncidentResponse createIncident(
            CreateIncidentRequest request,
            String creatorEmail
    ){
        User creator = userRepository
                .findByEmail(creatorEmail)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "User not found!"
                        )
                );

        Incident incident = new Incident(
                request.title(),
                request.description(),
                request.severity(),
                request.category(),
                creator
        );

        Incident savedIncident = incidentRepository.save(incident);

        auditService.log(
                savedIncident,
                creator,
                AuditAction.CREATED
        );

        notificationService.processIncidentAlerts(
                savedIncident
        );

        return toResponse(savedIncident);
    }

    @Transactional(readOnly = true)
    public Page<IncidentResponse> getAllIncidents(
            IncidentStatus status,
            Severity severity,
            IncidentCategory category,
            String search,
            Pageable pageable
    ){
        Page<Incident> incidents;

        if (status != null) {
            incidents = incidentRepository.findByStatus(
                    status,
                    pageable
            );
        }
        else if (severity != null) {
            incidents = incidentRepository.findBySeverity(
                    severity,
                    pageable
            );
        }
        else if (category != null) {
            incidents = incidentRepository.findByCategory(
                    category,
                    pageable
            );
        }
        else if (search != null && !search.isBlank()) {
            incidents =
                    incidentRepository.findByTitleContainingIgnoreCase(
                            search,
                            pageable
                    );
        }
        else {
            incidents = incidentRepository.findAll(pageable);
        }

        return incidents.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public IncidentResponse getIncident(
            Long id
    ){
        Incident response = incidentRepository
                .findById(id)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Incident not found!"
                        )
                );

        return toResponse(response);
    }

    @Transactional
    public IncidentResponse assignIncident(
            Long incidentId,
            Long technicianId,
            String currentUserEmail
    ){
        User currentUser = userRepository
                .findByEmail(currentUserEmail)
                .orElseThrow(
                        () -> new IllegalArgumentException("User not found!")
                );

        User technician = userRepository
                .findById(technicianId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Technician not found!"
                        )
                );

        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Incident not found!"
                        )
                );

        if (technician.getRole() != UserRole.TECHNICIAN) {
            throw new IllegalArgumentException(
                    "User must have TECHNICIAN role"
            );
        }

        incident.assignTo(technician);

        Incident savedIncident = incidentRepository.save(incident);

        auditService.log(
                savedIncident,
                currentUser,
                AuditAction.ASSIGNED
        );

        return toResponse(savedIncident);
    }

    @Transactional
    public IncidentResponse startProgress(
            Long incidentId,
            String currentUserEmail
    ){
        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Incident not found!"
                        )
                );

        User currentUser = userRepository
                .findByEmail(currentUserEmail)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "User not found!"
                        )
                );

        ensureCanWorkOnIncident(
                incident,
                currentUser
        );

        incident.startProgress();

        Incident savedIncident = incidentRepository.save(incident);

        auditService.log(
                savedIncident,
                currentUser,
                AuditAction.STARTED
        );

        return toResponse(savedIncident);
    }

    @Transactional
    public IncidentResponse resolveIncident(
            Long incidentId,
            String currentUserEmail
    ){
        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Incident not found!"
                        )
                );

        User currentUser = userRepository
                .findByEmail(currentUserEmail)
                .orElseThrow(
                        () -> new IllegalArgumentException("User not found!")
                );

        ensureCanWorkOnIncident(
                incident,
                currentUser
        );

        incident.resolve();

        Incident savedIncident = incidentRepository.save(incident);

        auditService.log(
                savedIncident,
                currentUser,
                AuditAction.RESOLVED
        );

        return toResponse(savedIncident);
    }

    private void ensureCanWorkOnIncident(
            Incident incident,
            User currentUser
    ) {

        if (currentUser.getRole() == UserRole.ADMIN) {
            return;
        }

        if (currentUser.getRole() != UserRole.TECHNICIAN) {
            throw new IllegalArgumentException(
                    "Only technicians can work on incidents"
            );
        }

        if (incident.getAssignedTo() == null) {
            throw new IllegalStateException(
                    "Incident is not assigned"
            );
        }

        if (!incident.getAssignedTo()
                .getId()
                .equals(currentUser.getId())) {

            throw new IllegalArgumentException(
                    "Incident is assigned to another technician"
            );
        }
    }

    private IncidentResponse toResponse(Incident incident) {

        User assignedTo = incident.getAssignedTo();

        return new IncidentResponse(
                incident.getId(),
                incident.getTitle(),
                incident.getDescription(),
                incident.getSeverity(),
                incident.getStatus(),
                incident.getCategory(),

                incident.getCreatedBy().getId(),
                incident.getCreatedBy().getEmail(),

                assignedTo != null
                        ? assignedTo.getId()
                        : null,

                assignedTo != null
                        ? assignedTo.getEmail()
                        : null,

                incident.getCreatedAt(),
                incident.getUpdatedAt(),
                incident.getResolvedAt()
        );
    }
}
