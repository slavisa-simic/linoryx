package com.vigil.api.location.provider;

import com.vigil.api.location.domain.LocationData;

public record GeocodingResult(
        LocationData location,
        String placeId,
        String resultType,
        String street,
        String houseNumber
) {
}
