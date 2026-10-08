package com.vigil.api.incident.services;


import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.exception.ResourceNotFoundException;
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
import com.vigil.api.user.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import com.vigil.api.user.domain.UserRole;

@Service
public class IncidentService {
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public IncidentService(
            IncidentRepository incidentRepository,
            UserRepository userRepository,
            UserService userService,
            AuditService auditService,
            NotificationService notificationService
    ){
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.auditService = auditService;
        this.notificationService = notificationService;
    }

    @Transactional
    public IncidentResponse createIncident(
            CreateIncidentRequest request,
            String creatorEmail
    ){
        User creator = userService.getActiveUser(creatorEmail);
        if (creator.getRole() != UserRole.USER && creator.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only users and administrators can create incidents");
        }

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
            String currentUserEmail,
            Pageable pageable
    ){
        User currentUser = userService.getActiveUser(currentUserEmail);
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.TECHNICIAN) {
            throw new AccessDeniedException("Only technicians and administrators can list incidents");
        }

        Long technicianId = null;
        if (currentUser.getRole() == UserRole.TECHNICIAN) {
            technicianId = currentUser.getId();
        }

        String searchText = null;
        if (search != null) {
            if (!search.isBlank()) {
                searchText = search.trim();
            }
        }

        Page<Incident> incidents = incidentRepository.findVisibleIncidents(
                technicianId, status, severity, category, searchText, pageable
        );
        return incidents.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public IncidentResponse getIncident(
            Long id,
            String currentUserEmail
    ) {
        User currentUser = userService.getActiveUser(currentUserEmail);
        Incident incident = incidentRepository
                .findById(id)
                .orElseThrow(
                        () -> new ResourceNotFoundException("Incident not found!")
                );

        ensureCanReadIncident(incident, currentUser);

        return toResponse(incident);
    }

    @Transactional
    public IncidentResponse assignIncident(
            Long incidentId,
            Long technicianId,
            String currentUserEmail
    ){
        User currentUser = userService.getActiveUser(currentUserEmail);
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can assign incidents");
        }

        User technician = userRepository
                .findById(technicianId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Technician not found!"
                        )
                );

        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Incident not found!"
                        )
                );

        if (technician.getRole() != UserRole.TECHNICIAN) {
            throw new IllegalArgumentException(
                    "User must have TECHNICIAN role"
            );
        }

        if (!technician.isEnabled()) {
            throw new IllegalStateException("Incident cannot be assigned to a disabled technician");
        }

        incident.assignTo(technician);

        Incident savedIncident = incidentRepository.save(incident);

        auditService.log(
                savedIncident,
                currentUser,
                AuditAction.ASSIGNED,
                technician
        );

        return toResponse(savedIncident);
    }

    @Transactional
    public IncidentResponse startProgress(
            Long incidentId,
            String currentUserEmail
    ){
        User currentUser = userService.getActiveUser(currentUserEmail);
        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Incident not found!"
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
        User currentUser = userService.getActiveUser(currentUserEmail);
        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Incident not found!"
                        )
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
            throw new AccessDeniedException(
                    "Only technicians can work on incidents"
            );
        }

        if (incident.getAssignedTo() == null || !incident.getAssignedTo()
                .getId()
                .equals(currentUser.getId())) {

            throw new AccessDeniedException(
                    "Incident is not assigned to you"
            );
        }
    }

    private void ensureCanReadIncident(Incident incident, User currentUser) {
        if (currentUser.getRole() == UserRole.ADMIN) {
            return;
        }

        if (currentUser.getRole() == UserRole.USER &&
                incident.getCreatedBy().getId().equals(currentUser.getId())) {
            return;
        }

        if (currentUser.getRole() == UserRole.TECHNICIAN &&
                incident.getAssignedTo() != null &&
                incident.getAssignedTo().getId().equals(currentUser.getId())) {
            return;
        }

        throw new AccessDeniedException("You cannot access this incident");
    }

    private IncidentResponse toResponse(Incident incident) {

        User assignedTo = incident.getAssignedTo();
        Long assignedToId = null;
        String assignedToEmail = null;
        if (assignedTo != null) {
            assignedToId = assignedTo.getId();
            assignedToEmail = assignedTo.getEmail();
        }

        return new IncidentResponse(
                incident.getId(),
                incident.getTitle(),
                incident.getDescription(),
                incident.getSeverity(),
                incident.getStatus(),
                incident.getCategory(),

                incident.getCreatedBy().getId(),
                incident.getCreatedBy().getEmail(),

                assignedToId,
                assignedToEmail,

                incident.getCreatedAt(),
                incident.getUpdatedAt(),
                incident.getResolvedAt()
        );
    }
}
