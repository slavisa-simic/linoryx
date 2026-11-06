package com.linoryx.api.auth.service;

import com.linoryx.api.auth.dto.AuthResponse;
import com.linoryx.api.auth.dto.LoginRequest;
import com.linoryx.api.auth.dto.RegisterRequest;
import com.linoryx.api.exception.UnauthorizedException;
import com.linoryx.api.user.domain.User;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.repository.UserRepository;
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
    void registrationAlwaysCreatesARegularUser() {
        RegisterRequest request = mock(RegisterRequest.class);
        when(request.getEmail()).thenReturn("new@test.com");
        when(request.getPassword()).thenReturn("Password123!");
        when(request.getFirstName()).thenReturn("New");
        when(request.getLastName()).thenReturn("User");
        when(passwordEncoder.encode("Password123!")).thenReturn("hash");

        authService.register(request);

        var user = org.mockito.ArgumentCaptor.forClass(User.class);
        org.mockito.Mockito.verify(userRepository).saveAndFlush(user.capture());
        assertEquals(UserRole.USER, user.getValue().getRole());
    }

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
