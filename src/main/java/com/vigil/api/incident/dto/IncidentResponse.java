package com.vigil.api.incident.dto;

import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;

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
        LocalDateTime resolvedAt

) {
}