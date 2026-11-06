package com.linoryx.api.network.dto;

import com.linoryx.api.network.domain.NodeStatus;
import com.linoryx.api.network.domain.NodeType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record NetworkNodeResponse(
        Long id, String code, String name, NodeType nodeType,
        String location, String city, String countryCode,
        BigDecimal latitude, BigDecimal longitude,
        NodeStatus status, LocalDateTime createdAt, long customerServiceCount
) {
}
