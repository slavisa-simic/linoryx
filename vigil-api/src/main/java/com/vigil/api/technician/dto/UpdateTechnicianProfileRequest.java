package com.vigil.api.technician.dto;

import com.vigil.api.technician.domain.*;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.Set;

public record UpdateTechnicianProfileRequest(
        @DecimalMin("-90") @DecimalMax("90") @Digits(integer = 3, fraction = 7) BigDecimal latitude,
        @DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 7) BigDecimal longitude,
        TechnicianAvailability availability,
        @NotNull Set<@NotNull TechnicianSpecialization> specializations
) {
    @AssertTrue(message = "Provide both latitude and longitude, or clear both.")
    public boolean isCoordinatePairValid() {
        return (latitude == null) == (longitude == null);
    }
}
