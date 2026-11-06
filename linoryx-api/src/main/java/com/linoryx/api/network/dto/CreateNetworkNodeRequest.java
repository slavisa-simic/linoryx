package com.linoryx.api.network.dto;

import com.linoryx.api.location.dto.LocationRequest;
import com.linoryx.api.network.domain.NodeStatus;
import com.linoryx.api.network.domain.NodeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record CreateNetworkNodeRequest(
        @NotBlank @Size(max = 150) String name,
        @NotNull NodeType nodeType,
        @NotNull @Valid LocationRequest location,
        NodeStatus status
) {
}
