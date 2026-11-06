package com.linoryx.api.audit.dto;

import com.linoryx.api.audit.domain.AuditAction;
import com.linoryx.api.user.domain.UserRole;
import java.time.LocalDateTime;

public record AuditResponse(
        Long id,
        Long incidentId,
        Long reportId,

        Long actorId,
        String actorFirstName,
        String actorLastName,

        Long targetUserId,
        String targetUserFirstName,
        String targetUserLastName,

        AuditAction action,
        LocalDateTime createdAt,
        UserRole previousRole,
        UserRole newRole
) {
}
