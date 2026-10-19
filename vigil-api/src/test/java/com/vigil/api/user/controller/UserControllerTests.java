package com.vigil.api.user.controller;

import com.vigil.api.config.JwtConfig;
import com.vigil.api.config.SecurityConfig;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.dto.UserResponse;
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

import java.time.LocalDateTime;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UserController.class, properties =
        "security.jwt.secret=test-secret-for-user-profile-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class UserControllerTests {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private UserService userService;

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void returnsOwnFullNameForEveryRole(UserRole role) throws Exception {
        when(userService.getCurrentUser("user@test.com")).thenReturn(new UserResponse(
                7L, "user@test.com", "Marko", "Markovic", role, true, LocalDateTime.now()
        ));

        mvc.perform(get("/api/users/me")
                        .with(jwt().jwt(claims -> claims.subject("user@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Marko"))
                .andExpect(jsonPath("$.lastName").value("Markovic"))
                .andExpect(jsonPath("$.email").value("user@test.com"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        verify(userService).getCurrentUser("user@test.com");
    }

    @Test
    void requiresAuthenticationForOwnProfile() throws Exception {
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
        verifyNoInteractions(userService);
    }

    @Test
    void ownProfileAccessDoesNotGrantAccessToOtherUsers() throws Exception {
        mvc.perform(get("/api/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TECHNICIAN"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }
}
