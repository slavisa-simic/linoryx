package com.linoryx.api.user.service;

import com.linoryx.api.audit.repository.AuditLogRepository;
import com.linoryx.api.exception.UnauthorizedException;
import com.linoryx.api.incident.repository.IncidentRepository;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.user.domain.User;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TechnicianListingTest {
    @Mock private UserRepository userRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private IncidentRepository incidentRepository;
    @Mock private CustomerReportRepository reports;
    @InjectMocks private UserService userService;

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "DISPATCHER"})
    void operatorsGetEnabledTechniciansForAssignment(UserRole role) {
        User operator = new User("operator@test.com", "hash", "Test", "Operator", role);
        User technician = new User("tech@test.com", "hash", "Ana", "Technician", UserRole.TECHNICIAN);
        ReflectionTestUtils.setField(technician, "id", 8L);
        when(userRepository.findByEmail(operator.getEmail())).thenReturn(Optional.of(operator));
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.TECHNICIAN)).thenReturn(List.of(technician));

        var result = userService.getTechnicians(operator.getEmail());

        assertEquals(1, result.size());
        assertEquals(8L, result.getFirst().id());
        assertEquals("Ana", result.getFirst().firstName());
        assertEquals("Technician", result.getFirst().lastName());
        verify(userRepository, never()).findAll();
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void serviceRejectsOtherRoles(UserRole role) {
        User user = new User("user@test.com", "hash", "Test", "User", role);
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(AccessDeniedException.class, () -> userService.getTechnicians(user.getEmail()));
        verify(userRepository, never()).findAllByRoleAndEnabledTrue(any());
    }

    @Test
    void serviceRejectsDisabledDispatcher() {
        User user = new User("dispatcher@test.com", "hash", "Test", "Dispatcher", UserRole.DISPATCHER);
        user.disable();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        assertThrows(UnauthorizedException.class, () -> userService.getTechnicians(user.getEmail()));
        verify(userRepository, never()).findAllByRoleAndEnabledTrue(any());
    }
}
