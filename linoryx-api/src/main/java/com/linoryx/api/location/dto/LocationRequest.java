package com.linoryx.api.location.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

// The server reads address fields from Geoapify, never from browser-supplied labels.
public record LocationRequest(
        @NotBlank @Size(max = 2048) String placeId,
        @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
        boolean positionConfirmed
) {
}
