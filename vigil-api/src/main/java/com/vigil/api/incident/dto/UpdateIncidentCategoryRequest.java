package com.vigil.api.incident.dto;

import com.vigil.api.incident.domain.IncidentCategory;
import jakarta.validation.constraints.NotNull;

public record UpdateIncidentCategoryRequest(@NotNull IncidentCategory category) {
}
