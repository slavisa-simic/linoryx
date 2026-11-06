package com.linoryx.api.audit.controller;

import com.linoryx.api.audit.domain.AuditAction;
import com.linoryx.api.audit.dto.AuditResponse;
import com.linoryx.api.audit.service.AuditService;
import com.linoryx.api.config.JwtConfig;
import com.linoryx.api.config.SecurityConfig;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.service.UserService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuditController.class, properties =
        "security.jwt.secret=test-secret-for-audit-logs-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class AuditControllerTests {
    @Autowired private MockMvc mvc;
    @MockitoBean private AuditService auditService;
    @MockitoBean private UserService userService;

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "DISPATCHER"})
    void operatorsCanReadAuditLogsIncludingRoleChanges(UserRole role) throws Exception {
        AuditResponse entry = new AuditResponse(
                12L, null, null, 1L, "Ana", "Admin", 2L, "Marko", "User",
                AuditAction.USER_ROLE_CHANGED, LocalDateTime.now(), UserRole.USER, UserRole.TECHNICIAN
        );
        when(auditService.getAllAuditLogs(eq("admin@test.com"), any()))
                .thenReturn(new PageImpl<>(List.of(entry)));

        mvc.perform(get("/api/audit")
                        .with(jwt().jwt(claims -> claims.subject("admin@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].action").value("USER_ROLE_CHANGED"))
                .andExpect(jsonPath("$.content[0].actorFirstName").value("Ana"))
                .andExpect(jsonPath("$.content[0].targetUserFirstName").value("Marko"))
                .andExpect(jsonPath("$.content[0].previousRole").value("USER"))
                .andExpect(jsonPath("$.content[0].newRole").value("TECHNICIAN"))
                .andExpect(jsonPath("$.totalPages").value(1));
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void otherRolesCannotReadAllAuditLogs(UserRole role) throws Exception {
        mvc.perform(get("/api/audit")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(auditService);
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void allRolesCanRequestVisibleIncidentHistory(UserRole role) throws Exception {
        mvc.perform(get("/api/incidents/10/audit")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().is(role == UserRole.USER ? 403 : 200));
    }

    @Test
    void auditLogsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/audit")).andExpect(status().isUnauthorized());
        verifyNoInteractions(auditService);
    }
}
