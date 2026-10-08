package com.vigil.api.incident.dto;

import jakarta.validation.constraints.NotNull;

public record AssignIncidentRequest(

        @NotNull
        Long technicianId

) {
}