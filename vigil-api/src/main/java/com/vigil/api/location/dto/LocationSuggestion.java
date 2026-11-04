package com.vigil.api.location.dto;

import com.vigil.api.location.domain.LocationData;

public record LocationSuggestion(
        LocationData location,
        String placeId,
        String resultType
) {
}
