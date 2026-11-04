package com.vigil.api.customerservice.dto;

import com.vigil.api.customerservice.domain.*;
import com.vigil.api.location.dto.LocationRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record CreateCustomerServiceRequest(
        @NotNull ServiceType serviceType,
        @NotNull @Valid LocationRequest location,
        @NotNull @Positive Long networkNodeId,
        ServiceStatus status
) {
}
