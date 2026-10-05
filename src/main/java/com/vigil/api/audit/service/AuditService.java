package com.vigil.api.audit.service;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.domain.AuditLog;
import com.vigil.api.audit.dto.AuditResponse;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;

    public AuditService(
            AuditLogRepository auditLogRepository,
            IncidentRepository incidentRepository,
            UserRepository userRepository
    ) {
        this.auditLogRepository = auditLogRepository;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void log(
            Incident incident,
            User actor,
            AuditAction action
    ) {

        AuditLog auditLog = new AuditLog(
                incident,
                actor,
                action
        );

        auditLogRepository.save(auditLog);
    }

    @Transactional(readOnly = true)
    public Page<AuditResponse> getIncidentAudit(
            Long incidentId,
            String currentUserEmail,
            Pageable pageable
    ) {

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
            Pageable pageable
    ) {

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

        return new AuditResponse(
                auditLog.getId(),
                auditLog.getIncident().getId(),

                actor != null
                        ? actor.getId()
                        : null,

                actor != null
                        ? actor.getFirstName()
                        : null,

                actor != null
                        ? actor.getLastName()
                        : null,

                auditLog.getAction(),
                auditLog.getCreatedAt()
        );
    }
}