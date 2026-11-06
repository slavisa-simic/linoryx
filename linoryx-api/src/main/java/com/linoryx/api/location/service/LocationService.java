package com.linoryx.api.location.service;

import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.location.dto.LocationRequest;
import com.linoryx.api.location.dto.LocationSuggestion;
import com.linoryx.api.location.provider.GeocodingProvider;
import com.linoryx.api.location.provider.GeocodingResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class LocationService {
    private final GeocodingProvider provider;

    public LocationService(GeocodingProvider provider) {
        this.provider = provider;
    }

    public List<LocationSuggestion> search(String query) {
        if (query == null || query.trim().length() < 3 || query.length() > 300) {
            throw new IllegalArgumentException("Enter an address between 3 and 300 characters.");
        }
        List<LocationSuggestion> suggestions = new ArrayList<>();
        for (GeocodingResult result : provider.search(query.trim())) {
            suggestions.add(new LocationSuggestion(result.location(), result.placeId(), result.resultType()));
        }
        return suggestions;
    }

    public LocationData verify(LocationRequest request) {
        if (request == null || request.placeId() == null || request.placeId().isBlank()) {
            throw new IllegalArgumentException("Select an address from the suggestions.");
        }
        if (request.latitude() == null || request.longitude() == null
                || request.latitude().abs().compareTo(BigDecimal.valueOf(90)) > 0
                || request.longitude().abs().compareTo(BigDecimal.valueOf(180)) > 0) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90 and longitude between -180 and 180.");
        }
        if (!request.positionConfirmed()) {
            throw new IllegalArgumentException("Confirm the precise marker position before saving the location.");
        }
        GeocodingResult selected = provider.getPlace(request.placeId());
        LocationData location = selected.location();
        boolean moved = request.latitude().compareTo(location.latitude()) != 0
                || request.longitude().compareTo(location.longitude()) != 0;
        if (moved) {
            GeocodingResult actual = provider.reverse(request.latitude(), request.longitude());
            if (!same(location.city(), actual.location().city())
                    || !same(location.countryCode(), actual.location().countryCode())
                    || (!selected.street().isBlank() && !same(selected.street(), actual.street()))
                    || (!selected.houseNumber().isBlank() && !same(selected.houseNumber(), actual.houseNumber()))) {
                throw new IllegalArgumentException("The marker does not match the selected address. Move it back or select the correct address.");
            }
        }
        return new LocationData(location.formattedAddress(), location.city(), location.countryCode(),
                request.latitude(), request.longitude());
    }

    private boolean same(String first, String second) {
        return normalize(first).equals(normalize(second));
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").trim().toUpperCase(Locale.ROOT);
    }
}
