package com.linoryx.api.report;

import com.linoryx.api.config.JwtConfig;
import com.linoryx.api.config.SecurityConfig;
import com.linoryx.api.report.controller.CustomerReportController;
import com.linoryx.api.report.service.CustomerReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = CustomerReportController.class, properties = "security.jwt.secret=test-secret-for-reports-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class ReportAccessTests {
    @Autowired MockMvc mvc;
    @MockitoBean CustomerReportService reports;

    @Test
    void technicianCanResolveReports() throws Exception {
        mvc.perform(patch("/api/reports/1/resolve")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TECHNICIAN"))))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotResolveReports() throws Exception {
        mvc.perform(patch("/api/reports/1/resolve")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(reports);
    }

    @Test
    void rejectsReportWithoutDescription() throws Exception {
        mvc.perform(post("/api/reports").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"customerServiceId\":1,\"category\":\"OTHER\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reports);
    }

    @Test
    void anonymousRequestsCannotReadReports() throws Exception {
        mvc.perform(get("/api/reports/my")).andExpect(status().isUnauthorized());
    }
}
