package com.linoryx.api.incident.dto;

import com.linoryx.api.incident.domain.IncidentCategory;
import jakarta.validation.constraints.NotNull;

public record UpdateIncidentCategoryRequest(@NotNull IncidentCategory category) {
}
