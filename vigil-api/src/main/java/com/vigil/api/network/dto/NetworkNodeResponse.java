package com.vigil.api.network.dto;

import com.vigil.api.network.domain.NodeStatus;
import com.vigil.api.network.domain.NodeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record NetworkNodeResponse(
        Long id, String code, String name, NodeType nodeType,
        String location, String city, String countryCode,
        BigDecimal latitude, BigDecimal longitude,
        NodeStatus status, LocalDateTime createdAt, long customerServiceCount
) {
}
