package com.vigil.api.network.dto;

import com.vigil.api.location.dto.LocationRequest;
import com.vigil.api.network.domain.NodeStatus;
import com.vigil.api.network.domain.NodeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record UpdateNetworkNodeRequest(
        @NotBlank @Size(max = 150) String name,
        @NotNull NodeType nodeType,
        @Valid LocationRequest location,
        @NotNull NodeStatus status
) {
}
