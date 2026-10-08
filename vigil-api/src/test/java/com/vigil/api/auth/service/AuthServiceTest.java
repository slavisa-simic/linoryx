package com.vigil.api.auth.service;

import com.vigil.api.auth.dto.AuthResponse;
import com.vigil.api.auth.dto.LoginRequest;
import com.vigil.api.auth.dto.RegisterRequest;
import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    void login_whenPasswordIsInvalid_throwsUnauthorizedException() {

        LoginRequest request = mock(LoginRequest.class);

        when(request.getEmail())
                .thenReturn("user@test.com");

        when(request.getPassword())
                .thenReturn("wrong-password");

        User user = new User(
                "user@test.com",
                "stored-password-hash",
                "Marko",
                "Markovic",
                UserRole.USER
        );

        when(userRepository.findByEmail("user@test.com"))
                .thenReturn(Optional.of(user));

        when(passwordEncoder.matches(
                "wrong-password",
                "stored-password-hash"
        )).thenReturn(false);

        assertThrows(
                UnauthorizedException.class,
                () -> authService.login(request)
        );
    }

    @Test
    void register_whenEmailAlreadyExists_throwsIllegalStateException() {

        RegisterRequest request = mock(RegisterRequest.class);

        when(request.getEmail())
                .thenReturn("user@test.com");

        when(userRepository.existsByEmail("user@test.com"))
                .thenReturn(true);

        assertThrows(
                IllegalStateException.class,
                () -> authService.register(request)
        );
    }

    @Test
    void login_whenCredentialsAreValid_returnsAuthResponse() {

        LoginRequest request = mock(LoginRequest.class);

        when(request.getEmail())
                .thenReturn("user@test.com");

        when(request.getPassword())
                .thenReturn("password123");

        User user = new User(
                "user@test.com",
                "stored-password-hash",
                "Marko",
                "Markovic",
                UserRole.USER
        );

        when(userRepository.findByEmail("user@test.com"))
                .thenReturn(Optional.of(user));

        when(passwordEncoder.matches(
                "password123",
                "stored-password-hash"
        )).thenReturn(true);

        when(jwtService.generateToken(user))
                .thenReturn("test-jwt-token");

        AuthResponse response = authService.login(request);

        assertEquals(
                "test-jwt-token",
                response.token()
        );

        assertEquals(
                "Bearer",
                response.tokenType()
        );
    }
}