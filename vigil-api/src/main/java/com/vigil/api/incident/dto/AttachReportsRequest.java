package com.vigil.api.incident.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record AttachReportsRequest(@NotEmpty List<@NotNull @Positive Long> reportIds) { }
