package com.linoryx.api.location.provider;

public class GeocodingUnavailableException extends RuntimeException {
    public GeocodingUnavailableException(String message) {
        super(message);
    }
}
