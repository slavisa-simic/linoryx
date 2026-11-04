package com.vigil.api.report;

import com.vigil.api.config.*;
import com.vigil.api.report.controller.CustomerReportController;
import com.vigil.api.report.service.CustomerReportService;
import com.vigil.api.user.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CustomerReportController.class, properties = "security.jwt.secret=test-secret-for-reports-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class ReportAccessTests {
    @Autowired MockMvc mvc;
    @MockitoBean CustomerReportService reports;

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void queueAndActionEndpointsEnforceRoles(UserRole role) throws Exception {
        var auth = jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role));
        boolean operator = role == UserRole.ADMIN || role == UserRole.DISPATCHER;
        mvc.perform(get("/api/reports").with(auth)).andExpect(status().is(operator ? 200 : 403));
        mvc.perform(get("/api/reports/my").with(auth)).andExpect(status().is(role == UserRole.USER ? 200 : 403));
        mvc.perform(get("/api/reports/assigned").with(auth)).andExpect(status().is(role == UserRole.TECHNICIAN ? 200 : 403));
        for (String action : new String[]{"start", "resolve"}) {
            mvc.perform(patch("/api/reports/1/" + action).with(auth)).andExpect(status().is(role == UserRole.TECHNICIAN ? 200 : 403));
        }
        for (String action : new String[]{"confirm-fixed", "still-not-working"}) {
            mvc.perform(patch("/api/reports/1/" + action).with(auth)).andExpect(status().is(role == UserRole.USER ? 200 : 403));
        }
        mvc.perform(patch("/api/reports/1/close").with(auth)).andExpect(status().is(operator ? 200 : 403));
        mvc.perform(patch("/api/reports/1/assign").with(auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"technicianId\":2}")).andExpect(status().is(operator ? 200 : 403));
        mvc.perform(post("/api/reports").with(auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerServiceId\":1,\"category\":\"NO_INTERNET\",\"description\":\"Offline\"}"))
                .andExpect(status().is(role == UserRole.USER ? 201 : 403));
    }

    @Test
    void invalidCategoriesAndDescriptionsReturnBadRequest() throws Exception {
        for (String body : new String[]{
                "{\"customerServiceId\":1,\"category\":\"INVALID\",\"description\":\"Offline\"}",
                "{\"customerServiceId\":1,\"category\":\"OTHER\",\"description\":\" \"}",
                "{\"customerServiceId\":1,\"category\":\"OTHER\",\"description\":\"" + "x".repeat(501) + "\"}"
        }) {
            mvc.perform(post("/api/reports").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER")))
                    .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        }
    }

    @Test
    void anonymousRequestsAreRejected() throws Exception {
        mvc.perform(get("/api/reports/my")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/reports/1/close")).andExpect(status().isUnauthorized());
    }
}
