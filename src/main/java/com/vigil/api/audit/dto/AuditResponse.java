package com.vigil.api.audit.dto;

import com.vigil.api.audit.domain.AuditAction;

import java.time.LocalDateTime;

public record AuditResponse(
        Long id,
        Long incidentId,

        Long actorId,
        String actorFirstName,
        String actorLastName,

        Long targetUserId,
        String targetUserFirstName,
        String targetUserLastName,

        AuditAction action,
        LocalDateTime createdAt
) {
}
