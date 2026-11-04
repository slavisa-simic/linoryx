package com.vigil.api.customerservice.dto;

import com.vigil.api.customerservice.domain.*;
import com.vigil.api.location.domain.LocationData;
import java.time.LocalDateTime;

public record CustomerServiceResponse(
        Long id, Long customerId, ServiceType serviceType,
        Long serviceLocationId, LocationData serviceLocation,
        Long networkNodeId, String networkNodeCode, String networkNodeName,
        ServiceStatus status, LocalDateTime createdAt
) {
}
