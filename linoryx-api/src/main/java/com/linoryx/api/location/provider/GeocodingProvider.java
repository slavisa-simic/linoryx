package com.linoryx.api.location.provider;

import java.math.BigDecimal;
import java.util.List;

public interface GeocodingProvider {
    List<GeocodingResult> search(String query);
    GeocodingResult getPlace(String placeId);
    GeocodingResult reverse(BigDecimal latitude, BigDecimal longitude);
}
