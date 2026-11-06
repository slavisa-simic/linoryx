package com.linoryx.api.location;

import com.sun.net.httpserver.HttpServer;
import com.linoryx.api.location.provider.*;
import org.junit.jupiter.api.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class GeoapifyClientTest {
    private HttpServer server;
    private GeoapifyClient client;
    private int status = 200;
    private String requestPath;
    private String body = """
            {"features":[{"properties":{
              "formatted":"Main Street 42, Novi Sad, Serbia", "city":"Novi Sad", "country_code":"rs",
              "lat":45.25,"lon":19.84,"place_id":"verified-place","street":"Main Street","housenumber":"42",
              "result_type":"building"
            }}]}
            """;

    @BeforeEach
    void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            requestPath = exchange.getRequestURI().toString();
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        client = new GeoapifyClient("http://127.0.0.1:" + server.getAddress().getPort(), "test-key", 2);
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    @Test
    void parsesProviderResponseAndEncodesSearchText() {
        var result = client.search("Main & Side Street").getFirst();
        assertEquals("RS", result.location().countryCode());
        assertEquals("Novi Sad", result.location().city());
        assertEquals("building", result.resultType());
        assertTrue(requestPath.contains("%26"));
    }

    @Test
    void detailsWithoutResultTypeStillRequireUsableAddressFields() {
        body = body.replace("\"result_type\":\"building\"", "\"feature_type\":\"details\"");
        assertEquals("verified-place", client.getPlace("verified-place").placeId());
        assertEquals("building", client.getPlace("verified-place").resultType());
        assertTrue(requestPath.startsWith("/v2/place-details?id="));
    }

    @Test
    void reverseUsesBothCoordinates() {
        assertEquals("Novi Sad", client.reverse(new BigDecimal("45.25"), new BigDecimal("19.84")).location().city());
        assertTrue(requestPath.contains("lat=45.25"));
        assertTrue(requestPath.contains("lon=19.84"));
    }

    @Test
    void unsupportedAndEmptyResultsAreNotAccepted() {
        body = body.replace("\"city\":\"Novi Sad\"", "\"city\":\"\"");
        assertTrue(client.search("Somewhere").isEmpty());
        assertThrows(IllegalArgumentException.class, () -> client.getPlace("unknown"));
        body = "{\"features\":[]}";
        assertThrows(IllegalArgumentException.class, () -> client.reverse(BigDecimal.ZERO, BigDecimal.ZERO));
    }

    @Test
    void rateLimitsAndMissingConfigurationHaveHelpfulErrors() {
        status = 429;
        assertTrue(assertThrows(GeocodingUnavailableException.class, () -> client.search("Somewhere"))
                .getMessage().contains("rate limit"));
        GeoapifyClient missingKey = new GeoapifyClient("http://127.0.0.1", "", 2);
        assertTrue(assertThrows(GeocodingUnavailableException.class, () -> missingKey.search("Somewhere"))
                .getMessage().contains("not configured"));
    }
}
