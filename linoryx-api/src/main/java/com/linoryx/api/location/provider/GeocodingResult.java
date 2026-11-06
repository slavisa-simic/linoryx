package com.linoryx.api.location.provider;

import com.linoryx.api.location.domain.LocationData;

public record GeocodingResult(
        LocationData location,
        String placeId,
        String resultType,
        String street,
        String houseNumber
) {
}
