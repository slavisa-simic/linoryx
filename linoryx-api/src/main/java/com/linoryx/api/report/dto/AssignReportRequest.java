package com.linoryx.api.report.dto;

import jakarta.validation.constraints.*;

public record AssignReportRequest(@NotNull @Positive Long technicianId) { }
