package com.linoryx.api.location;

import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.location.dto.LocationRequest;
import com.linoryx.api.location.provider.*;
import com.linoryx.api.location.service.LocationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LocationServiceTest {
    @Mock GeocodingProvider provider;
    @InjectMocks LocationService service;

    private GeocodingResult place(String city, String country, String street, String number) {
        return new GeocodingResult(new LocationData(street + " " + number + ", " + city, city, country,
                new BigDecimal("44.8"), new BigDecimal("20.4")), "place", "building", street, number);
    }

    @Test
    void addressFieldsComeFromTheProvider() {
        when(provider.getPlace("place")).thenReturn(place("Belgrade", "RS", "Main Street", "42"));
        LocationData result = service.verify(new LocationRequest("place", new BigDecimal("44.800"), new BigDecimal("20.400"), true));
        assertEquals("Belgrade", result.city());
        assertEquals("RS", result.countryCode());
        verify(provider, never()).reverse(any(), any());
    }

    @Test
    void markerInHongKongCannotBeSubmittedForBelgrade() {
        when(provider.getPlace("place")).thenReturn(place("Belgrade", "RS", "Main Street", "42"));
        when(provider.reverse(new BigDecimal("22.3"), new BigDecimal("114.2")))
                .thenReturn(place("Hong Kong", "HK", "Main Street", "42"));
        assertThrows(IllegalArgumentException.class, () -> service.verify(
                new LocationRequest("place", new BigDecimal("22.3"), new BigDecimal("114.2"), true)));
    }

    @Test
    void differentHouseOnTheSameStreetIsRejected() {
        when(provider.getPlace("place")).thenReturn(place("Belgrade", "RS", "Main Street", "42"));
        when(provider.reverse(any(), any())).thenReturn(place("Belgrade", "RS", "Main Street", "50"));
        assertThrows(IllegalArgumentException.class, () -> service.verify(
                new LocationRequest("place", new BigDecimal("44.81"), new BigDecimal("20.41"), true)));
    }

    @Test
    void cityCentroidCanBeRefinedWithoutAnArbitraryDistanceLimit() {
        when(provider.getPlace("place")).thenReturn(place("Belgrade", "RS", "", ""));
        when(provider.reverse(any(), any())).thenReturn(place("Belgrade", "RS", "Other Street", "7"));
        LocationData result = service.verify(new LocationRequest("place", new BigDecimal("44.9"), new BigDecimal("20.6"), true));
        assertEquals(new BigDecimal("44.9"), result.latitude());
    }

    @Test
    void precisePositionMustBeConfirmedEvenForACityResult() {
        assertThrows(IllegalArgumentException.class, () -> service.verify(
                new LocationRequest("place", BigDecimal.ZERO, BigDecimal.ZERO, false)));
        verifyNoInteractions(provider);
    }

    @Test
    void invalidCoordinatesAndMissingSelectionsNeverReachTheProvider() {
        assertThrows(IllegalArgumentException.class, () -> service.verify(null));
        assertThrows(IllegalArgumentException.class, () -> service.verify(
                new LocationRequest("place", BigDecimal.valueOf(91), BigDecimal.ZERO, true)));
        assertThrows(IllegalArgumentException.class, () -> service.verify(
                new LocationRequest("place", BigDecimal.ZERO, BigDecimal.valueOf(-181), true)));
        verifyNoInteractions(provider);
    }

    @Test
    void autocompletePreservesPrecisionMetadata() {
        when(provider.search("Main Street")).thenReturn(List.of(place("Belgrade", "RS", "Main Street", "42")));
        assertEquals("building", service.search("Main Street").getFirst().resultType());
        assertThrows(IllegalArgumentException.class, () -> service.search("ab"));
    }
}
