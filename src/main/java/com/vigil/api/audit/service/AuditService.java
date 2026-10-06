package com.vigil.api.audit.service;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.domain.AuditLog;
import com.vigil.api.audit.dto.AuditResponse;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final IncidentRepository incidentRepository;
    private final UserService userService;

    public AuditService(
            AuditLogRepository auditLogRepository,
            IncidentRepository incidentRepository,
            UserService userService
    ) {
        this.auditLogRepository = auditLogRepository;
        this.incidentRepository = incidentRepository;
        this.userService = userService;
    }

    @Transactional
    public void log(
            Incident incident,
            User actor,
            AuditAction action
    ) {
        log(incident, actor, action, null);
    }

    @Transactional
    public void log(
            Incident incident,
            User actor,
            AuditAction action,
            User targetUser
    ) {
        if (actor != null && !actor.isEnabled()) {
            throw new UnauthorizedException("Authentication required");
        }

        AuditLog auditLog = new AuditLog(
                incident,
                actor,
                action,
                targetUser
        );

        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public Page<AuditResponse> getIncidentAudit(
            Long incidentId,
            String currentUserEmail,
            Pageable pageable
    ) {
        User currentUser = userService.getActiveUser(currentUserEmail);
        Incident incident = incidentRepository
                .findById(incidentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Incident not found!"
                        )
                );

        ensureCanViewAudit(
                incident,
                currentUser
        );

        return auditLogRepository
                .findByIncidentIdOrderByCreatedAtAsc(
                        incidentId,
                        pageable
                )
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<AuditResponse> getAllAuditLogs(
            String currentUserEmail,
            Pageable pageable
    ) {
        User currentUser = userService.getActiveUser(currentUserEmail);
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can view all audit logs");
        }

        return auditLogRepository
                .findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toResponse);
    }

    private void ensureCanViewAudit(
            Incident incident,
            User currentUser
    ) {

        if (currentUser.getRole() == UserRole.ADMIN) {
            return;
        }

        if (currentUser.getRole() == UserRole.USER) {

            if (incident.getCreatedBy()
                    .getId()
                    .equals(currentUser.getId())) {
                return;
            }

            throw new AccessDeniedException(
                    "You cannot view this incident history"
            );
        }

        if (currentUser.getRole() == UserRole.TECHNICIAN) {

            if (incident.getAssignedTo() != null &&
                    incident.getAssignedTo()
                            .getId()
                            .equals(currentUser.getId())) {
                return;
            }

            throw new AccessDeniedException(
                    "You cannot view this incident history"
            );
        }

        throw new AccessDeniedException(
                "Access denied"
        );
    }

    private AuditResponse toResponse(
            AuditLog auditLog
    ) {

        User actor = auditLog.getActor();
        Long actorId = null;
        String actorFirstName = null;
        String actorLastName = null;
        if (actor != null) {
            actorId = actor.getId();
            actorFirstName = actor.getFirstName();
            actorLastName = actor.getLastName();
        }

        User targetUser = auditLog.getTargetUser();
        Long targetUserId = null;
        String targetUserFirstName = null;
        String targetUserLastName = null;
        if (targetUser != null) {
            targetUserId = targetUser.getId();
            targetUserFirstName = targetUser.getFirstName();
            targetUserLastName = targetUser.getLastName();
        }

        return new AuditResponse(
                auditLog.getId(),
                auditLog.getIncident().getId(),

                actorId,
                actorFirstName,
                actorLastName,

                targetUserId,
                targetUserFirstName,
                targetUserLastName,

                auditLog.getAction(),
                auditLog.getCreatedAt()
        );
    }
}
