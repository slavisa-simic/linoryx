package com.vigil.api.auth.controller;

import com.vigil.api.auth.dto.RegisterRequest;
import com.vigil.api.auth.service.AuthService;
import com.vigil.api.config.JwtConfig;
import com.vigil.api.config.SecurityConfig;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@WebMvcTest(controllers = AuthController.class, properties =
        "security.jwt.secret=test-secret-for-registration-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class AuthControllerTests {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private AuthService authService;

    @Test
    void registersWithoutBearerToken() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"user@test.com","password":"Password123!",
                                 "firstName":"Normal","lastName":"User"}
                                """))
                .andExpect(status().isCreated());

        verify(authService).register(argThat((RegisterRequest request) ->
                "user@test.com".equals(request.getEmail())
                        && "Password123!".equals(request.getPassword())
                        && "Normal".equals(request.getFirstName())
                        && "User".equals(request.getLastName())));
    }

    @Test
    void rejectsInvalidRegistrationAsBadRequest() throws Exception {
        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"invalid","password":"short",
                                 "firstName":"Normal","lastName":"User"}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    void permitsErrorDispatchWithoutBearerToken() throws Exception {
        mvc.perform(get("/error").with(request -> {
                    request.setDispatcherType(DispatcherType.ERROR);
                    request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 400);
                    request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/api/auth/register");
                    return request;
                }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void stillProtectsDirectErrorRequestsAndOtherEndpoints() throws Exception {
        mvc.perform(get("/error")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }
}
