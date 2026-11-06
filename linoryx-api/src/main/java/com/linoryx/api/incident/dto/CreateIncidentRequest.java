package com.linoryx.api.incident.dto;

import com.linoryx.api.incident.domain.IncidentCategory;
import com.linoryx.api.incident.domain.Severity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateIncidentRequest(

        @NotBlank
        @Size(max = 150)
        String title,

        @NotBlank
        @Size(max = 2000)
        String description,

        @NotNull
        Severity severity,

        IncidentCategory category,

        @NotEmpty
        List<@NotNull @Positive Long> reportIds

) {
}
