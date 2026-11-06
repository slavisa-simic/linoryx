package com.linoryx.api.location.domain;

import java.math.BigDecimal;

public record LocationData(
        String formattedAddress,
        String city,
        String countryCode,
        BigDecimal latitude,
        BigDecimal longitude
) {
}
