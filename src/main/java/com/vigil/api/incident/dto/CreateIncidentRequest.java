package com.vigil.api.incident.dto;

import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.Severity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateIncidentRequest(

        @NotBlank
        @Size(max = 150)
        String title,

        @NotBlank
        @Size(max = 2000)
        String description,

        @NotNull
        Severity severity,

        @NotNull
        IncidentCategory category

) {
}