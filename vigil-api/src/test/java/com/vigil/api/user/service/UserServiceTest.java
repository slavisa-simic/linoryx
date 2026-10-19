package com.vigil.api.user.service;

import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void returnsRegisteredFirstAndLastName() {
        User user = new User("user@test.com", "hash", "Marko", "Markovic", UserRole.USER);
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        var profile = userService.getCurrentUser("user@test.com");

        assertEquals("Marko", profile.firstName());
        assertEquals("Markovic", profile.lastName());
        assertEquals("user@test.com", profile.email());
    }

    @Test
    void rejectsDisabledUser() {
        User user = new User("user@test.com", "hash", "Marko", "Markovic", UserRole.USER);
        user.disable();
        when(userRepository.findByEmail("user@test.com")).thenReturn(Optional.of(user));

        assertThrows(UnauthorizedException.class, () -> userService.getCurrentUser("user@test.com"));
    }

    @Test
    void rejectsMissingUser() {
        when(userRepository.findByEmail("missing@test.com")).thenReturn(Optional.empty());

        assertThrows(UnauthorizedException.class, () -> userService.getCurrentUser("missing@test.com"));
    }
}
