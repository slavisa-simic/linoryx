package com.linoryx.api.incident.dto;

import com.linoryx.api.incident.domain.IncidentCategory;
import com.linoryx.api.incident.domain.IncidentStatus;
import com.linoryx.api.incident.domain.Severity;
import java.time.LocalDateTime;

public record IncidentResponse(

        Long id,
        String title,
        String description,
        Severity severity,
        IncidentStatus status,
        IncidentCategory category,

        Long createdById,
        String createdByEmail,

        Long assignedToId,
        String assignedToEmail,

        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt,
        LocalDateTime closedAt,
        boolean legacy,
        String legacyStatus,
        long reportCount,
        long closedReportCount

) {
}