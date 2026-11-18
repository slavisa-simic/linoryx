package com.linoryx.api.user.controller;

import com.linoryx.api.config.JwtConfig;
import com.linoryx.api.config.SecurityConfig;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.dto.UserResponse;
import com.linoryx.api.user.service.UserService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
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

    @Test
    void userCanReadTheirOwnProfile() throws Exception {
        when(userService.getCurrentUser("user@test.com")).thenReturn(new UserResponse(
                7L, "user@test.com", "Marko", "Markovic", UserRole.USER, true, LocalDateTime.now()
        ));

        mvc.perform(get("/api/users/me")
                        .with(jwt().jwt(claims -> claims.subject("user@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Marko"))
                .andExpect(jsonPath("$.lastName").value("Markovic"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
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

    @Test
    void regularUserCannotReadUserTable() throws Exception {
        mvc.perform(get("/api/users")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }

    @Test
    void administratorCanChangeUserRole() throws Exception {
        UserResponse user = new UserResponse(7L, "user@test.com", "Marko", "Markovic", UserRole.TECHNICIAN, true, LocalDateTime.now());
        when(userService.changeUserRole("admin@test.com", 7L, UserRole.TECHNICIAN)).thenReturn(user);

        mvc.perform(patch("/api/users/7/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"TECHNICIAN\"}")
                        .with(jwt().jwt(claims -> claims.subject("admin@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("TECHNICIAN"));
    }

    @Test
    void dispatcherCannotChangeUserRole() throws Exception {
        mvc.perform(patch("/api/users/7/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"TECHNICIAN\"}")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DISPATCHER"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(userService);
    }
}
