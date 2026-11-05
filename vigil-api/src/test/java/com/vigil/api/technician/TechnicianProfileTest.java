package com.vigil.api.technician;

import com.vigil.api.technician.domain.*;
import java.math.BigDecimal;
import java.util.Set;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import static org.junit.jupiter.api.Assertions.*;

class TechnicianProfileTest {
    @ParameterizedTest
    @CsvSource({"91,0", "-91,0", "0,181", "0,-181", "1,null", "null,1"})
    void invalidOrPartialCoordinatesAreRejected(String latitude, String longitude) {
        BigDecimal lat = "null".equals(latitude) ? null : new BigDecimal(latitude);
        BigDecimal lon = "null".equals(longitude) ? null : new BigDecimal(longitude);
        TechnicianProfile profile = new TechnicianProfile(null);
        assertThrows(IllegalArgumentException.class, () -> profile.update(lat, lon, null, Set.of()));
    }
}
