package com.linoryx.api.customerservice.dto;

import com.linoryx.api.customerservice.domain.*;
import com.linoryx.api.location.dto.LocationRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record CreateCustomerServiceRequest(
        @NotNull ServiceType serviceType,
        @NotNull @Valid LocationRequest location,
        @NotNull @Positive Long networkNodeId,
        ServiceStatus status
) {
}
