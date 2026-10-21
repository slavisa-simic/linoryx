package com.vigil.api.audit.controller;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.dto.AuditResponse;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.config.JwtConfig;
import com.vigil.api.config.SecurityConfig;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;
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

import java.time.LocalDateTime;
import java.util.List;

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

    @Test
    void administratorCanReadAuditLogsIncludingRoleChanges() throws Exception {
        AuditResponse entry = new AuditResponse(
                12L, null, 1L, "Ana", "Admin", 2L, "Marko", "User",
                AuditAction.USER_ROLE_CHANGED, LocalDateTime.now(), UserRole.USER, UserRole.TECHNICIAN
        );
        when(auditService.getAllAuditLogs(eq("admin@test.com"), any()))
                .thenReturn(new PageImpl<>(List.of(entry)));

        mvc.perform(get("/api/audit")
                        .with(jwt().jwt(claims -> claims.subject("admin@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
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

    @Test
    void auditLogsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/audit")).andExpect(status().isUnauthorized());
        verifyNoInteractions(auditService);
    }
}
