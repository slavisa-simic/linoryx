package com.vigil.api.report.dto;

import com.vigil.api.report.domain.ReportCategory;
import jakarta.validation.constraints.*;

public record CreateReportRequest(
        @NotNull @Positive Long customerServiceId,
        @NotNull ReportCategory category,
        @NotBlank @Size(max = 500) String description
) { }
