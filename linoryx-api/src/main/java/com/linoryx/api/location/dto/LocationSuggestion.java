package com.linoryx.api.location.dto;

import com.linoryx.api.location.domain.LocationData;

public record LocationSuggestion(
        LocationData location,
        String placeId,
        String resultType
) {
}
