package com.linoryx.api.startup;

import com.linoryx.api.config.JwtConfig;
import com.linoryx.api.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ReadinessController.class, properties =
        "security.jwt.secret=test-readiness-secret-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class ReadinessControllerTests {
    @Autowired private MockMvc mvc;
    @MockitoBean private ApplicationAvailability availability;

    @Test
    void readyIsPublicMinimalAndNeverCached() throws Exception {
        when(availability.getReadinessState()).thenReturn(ReadinessState.ACCEPTING_TRAFFIC);
        mvc.perform(get("/api/auth/readiness"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().json("{\"status\":\"READY\"}"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void startupAndShutdownRefuseTraffic() throws Exception {
        when(availability.getReadinessState()).thenReturn(ReadinessState.REFUSING_TRAFFIC);
        mvc.perform(get("/api/auth/readiness"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().json("{\"status\":\"UNAVAILABLE\"}"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void businessEndpointsStillRequireAuthentication() throws Exception {
        mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
    }
}
