package com.vigil.api.user.controller;

import com.vigil.api.config.JwtConfig;
import com.vigil.api.config.SecurityConfig;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.dto.UserResponse;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageImpl;
import java.util.List;

import java.time.LocalDateTime;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

    @Test
    void administratorCanReadUserTable() throws Exception {
        UserResponse user = new UserResponse(7L, "user@test.com", "Marko", "Markovic", UserRole.USER, true, LocalDateTime.now());
        when(userService.getAllUsers(eq("admin@test.com"), any())).thenReturn(new PageImpl<>(List.of(user)));
        mvc.perform(get("/api/users")
                        .with(jwt().jwt(claims -> claims.subject("admin@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].email").value("user@test.com"))
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist());
    }

    @ParameterizedTest
    @ValueSource(strings = {"role", "disable", "enable"})
    void administratorCanManageUser(String action) throws Exception {
        UserResponse user = new UserResponse(7L, "user@test.com", "Marko", "Markovic", UserRole.ADMIN, true, LocalDateTime.now());
        if (action.equals("role")) {
            when(userService.changeUserRole("admin@test.com", 7L, UserRole.ADMIN)).thenReturn(user);
        } else if (action.equals("disable")) {
            when(userService.disableUser("admin@test.com", 7L)).thenReturn(user);
        } else {
            when(userService.enableUser("admin@test.com", 7L)).thenReturn(user);
        }
        mvc.perform(patch("/api/users/7/" + action)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}")
                        .with(jwt().jwt(claims -> claims.subject("admin@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(7));
    }

    @ParameterizedTest
    @CsvSource({"USER,role", "TECHNICIAN,role", "USER,disable", "TECHNICIAN,disable", "USER,enable", "TECHNICIAN,enable"})
    void otherRolesCannotManageUsers(String role, String action) throws Exception {
        mvc.perform(patch("/api/users/7/" + action)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }

    @Test
    void roleIsRequired() throws Exception {
        mvc.perform(patch("/api/users/7/role")
                        .contentType(MediaType.APPLICATION_JSON).content("{}")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(userService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"role", "disable", "enable"})
    void managementRequiresAuthentication(String action) throws Exception {
        mvc.perform(patch("/api/users/7/" + action)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"role\":\"ADMIN\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(userService);
    }
}
