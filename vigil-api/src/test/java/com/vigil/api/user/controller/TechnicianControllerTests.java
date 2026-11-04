package com.vigil.api.user.controller;

import com.vigil.api.config.JwtConfig;
import com.vigil.api.config.SecurityConfig;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.dto.TechnicianResponse;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = TechnicianController.class, properties =
        "security.jwt.secret=test-secret-for-technicians-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class TechnicianControllerTests {
    @Autowired private MockMvc mvc;
    @MockitoBean private UserService userService;

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "DISPATCHER"})
    void operatorsCanListTechniciansWithOnlyAssignmentFields(UserRole role) throws Exception {
        when(userService.getTechnicians("operator@test.com"))
                .thenReturn(List.of(new TechnicianResponse(8L, "Ana", "Technician")));

        mvc.perform(get("/api/technicians")
                        .with(jwt().jwt(claims -> claims.subject("operator@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        [{"id":8,"firstName":"Ana","lastName":"Technician"}]
                        """, org.springframework.test.json.JsonCompareMode.STRICT));
        verify(userService).getTechnicians("operator@test.com");
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void otherRolesCannotListTechnicians(UserRole role) throws Exception {
        mvc.perform(get("/api/technicians")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }

    @Test
    void listingRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/technicians")).andExpect(status().isUnauthorized());
        verifyNoInteractions(userService);
    }
}
