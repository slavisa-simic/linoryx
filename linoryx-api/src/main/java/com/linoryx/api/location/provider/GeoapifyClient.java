package com.linoryx.api.location.provider;

import com.linoryx.api.location.domain.LocationData;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.http.client.JdkClientHttpRequestFactory;

@Component
public class GeoapifyClient implements GeocodingProvider {
    private final RestClient client;
    private final String apiKey;

    public GeoapifyClient(
            @Value("${location.geoapify.base-url}") String baseUrl,
            @Value("${location.geoapify.api-key}") String apiKey,
            @Value("${location.geoapify.timeout-seconds}") int timeoutSeconds
    ) {
        this.apiKey = apiKey;
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.client = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }

    @Override
    public List<GeocodingResult> search(String query) {
        JsonNode body = get("/v1/geocode/autocomplete", "text", query);
        List<GeocodingResult> results = new ArrayList<>();
        for (JsonNode feature : body.path("features")) {
            GeocodingResult result = parse(feature.path("properties"));
            if (result != null) {
                results.add(result);
            }
        }
        return results;
    }

    @Override
    public GeocodingResult getPlace(String placeId) {
        JsonNode body = get("/v2/place-details", "id", placeId);
        return firstResult(body);
    }

    @Override
    public GeocodingResult reverse(BigDecimal latitude, BigDecimal longitude) {
        ensureConfigured();
        try {
            JsonNode body = client.get().uri(builder -> builder.path("/v1/geocode/reverse")
                    .queryParam("lat", latitude).queryParam("lon", longitude)
                    .queryParam("lang", "en").queryParam("apiKey", apiKey).build())
                    .retrieve().body(JsonNode.class);
            return firstResult(body);
        } catch (RestClientResponseException exception) {
            throw providerError(exception);
        } catch (RestClientException exception) {
            throw new GeocodingUnavailableException("Location lookup is unavailable. Please try again.");
        }
    }

    private JsonNode get(String path, String parameter, String value) {
        ensureConfigured();
        try {
            JsonNode body = client.get().uri(builder -> builder.path(path)
                    .queryParam(parameter, "{value}").queryParam("lang", "en")
                    .queryParam("apiKey", apiKey).build(value))
                    .retrieve().body(JsonNode.class);
            if (body == null) {
                throw new GeocodingUnavailableException("Location lookup returned an empty response. Please try again.");
            }
            return body;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 400) {
                throw new IllegalArgumentException("Select a valid address from the suggestions.");
            }
            throw providerError(exception);
        } catch (RestClientException exception) {
            throw new GeocodingUnavailableException("Location lookup is unavailable. Please try again.");
        }
    }

    private void ensureConfigured() {
        if (apiKey.isBlank()) {
            throw new GeocodingUnavailableException("Location search is not configured. Set GEOAPIFY_API_KEY on the server.");
        }
    }

    private GeocodingUnavailableException providerError(RestClientResponseException exception) {
        if (exception.getStatusCode().value() == 429) {
            return new GeocodingUnavailableException("Location lookup has reached its rate limit. Please wait and try again.");
        }
        return new GeocodingUnavailableException("Location lookup is unavailable. Please try again.");
    }

    private GeocodingResult firstResult(JsonNode body) {
        if (body != null) {
            for (JsonNode feature : body.path("features")) {
                GeocodingResult result = parse(feature.path("properties"));
                if (result != null) {
                    return result;
                }
            }
        }
        throw new IllegalArgumentException("This location could not be verified. Select a more specific address.");
    }

    private GeocodingResult parse(JsonNode properties) {
        String address = properties.path("formatted").asText("");
        String city = properties.path("city").asText("");
        String country = properties.path("country_code").asText("").toUpperCase(Locale.ROOT);
        String placeId = properties.path("place_id").asText("");
        String street = properties.path("street").asText("");
        String houseNumber = properties.path("housenumber").asText("");
        String resultType = properties.path("result_type").asText("");
        // Place Details does not always include result_type.
        if (resultType.isBlank()) {
            resultType = "city";
            if (!street.isBlank()) {
                resultType = "street";
            }
            if (!houseNumber.isBlank() && !street.isBlank()) {
                resultType = "building";
            }
        }
        List<String> supported = List.of("building", "amenity", "street", "city", "suburb", "district", "postcode");
        if (address.isBlank() || city.isBlank() || !country.matches("[A-Z]{2}") || placeId.isBlank()
                || !supported.contains(resultType) || !properties.path("lat").isNumber()
                || !properties.path("lon").isNumber()) {
            return null;
        }
        BigDecimal latitude = properties.path("lat").decimalValue();
        BigDecimal longitude = properties.path("lon").decimalValue();
        if (latitude.abs().compareTo(BigDecimal.valueOf(90)) > 0
                || longitude.abs().compareTo(BigDecimal.valueOf(180)) > 0) {
            return null;
        }
        return new GeocodingResult(new LocationData(address, city, country, latitude, longitude),
                placeId, resultType, street, houseNumber);
    }
}
