package com.vigil.api.audit.service;

import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private UserService userService;

    @InjectMocks
    private AuditService auditService;

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void onlyAdminCanReadAllAuditLogs(UserRole role) {
        User user = new User("user@test.com", "hash", "Test", "User", role);
        when(userService.getActiveUser("user@test.com")).thenReturn(user);
        assertThrows(AccessDeniedException.class,
                () -> auditService.getAllAuditLogs("user@test.com", PageRequest.of(0, 20)));
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void allAuditLogsIncludeRoleChangesWithoutAnIncident() {
        User admin = new User("admin@test.com", "hash", "Ana", "Admin", UserRole.ADMIN);
        User target = new User("user@test.com", "hash", "Marko", "User", UserRole.TECHNICIAN);
        var log = new com.vigil.api.audit.domain.AuditLog(admin, target, UserRole.USER, UserRole.TECHNICIAN);
        Pageable pageable = PageRequest.of(0, 20);
        when(userService.getActiveUser("admin@test.com")).thenReturn(admin);
        when(auditLogRepository.findAllByOrderByCreatedAtDesc(pageable))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of(log)));

        var response = auditService.getAllAuditLogs("admin@test.com", pageable).getContent().getFirst();

        assertNull(response.incidentId());
        assertEquals(UserRole.USER, response.previousRole());
        assertEquals(UserRole.TECHNICIAN, response.newRole());
        assertEquals("Ana", response.actorFirstName());
        assertEquals("Marko", response.targetUserFirstName());
    }

    @Test
    void getIncidentAudit_whenIncidentDoesNotExist_throwsResourceNotFoundException() {

        Long incidentId = 999L;
        String email = "admin@test.com";

        User user = mock(User.class);

        Pageable pageable = PageRequest.of(0, 20);

        when(userService.getActiveUser(email))
                .thenReturn(user);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> auditService.getIncidentAudit(
                        incidentId,
                        email,
                        pageable
                )
        );
    }

    @Test
    void getIncidentAudit_whenUserDoesNotOwnIncident_throwsAccessDeniedException() {

        Long incidentId = 1L;
        String email = "user@test.com";

        User currentUser = mock(User.class);
        User creator = mock(User.class);
        Incident incident = mock(Incident.class);

        Pageable pageable = PageRequest.of(0, 20);

        when(userService.getActiveUser(email))
                .thenReturn(currentUser);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.of(incident));

        when(currentUser.getRole())
                .thenReturn(UserRole.USER);

        when(currentUser.getId())
                .thenReturn(10L);

        when(incident.getCreatedBy())
                .thenReturn(creator);

        when(creator.getId())
                .thenReturn(20L);

        assertThrows(
                AccessDeniedException.class,
                () -> auditService.getIncidentAudit(
                        incidentId,
                        email,
                        pageable
                )
        );
    }

    @Test
    void getIncidentAudit_whenUserIsAdmin_returnsAuditPage() {

        Long incidentId = 1L;
        String email = "admin@test.com";

        User admin = mock(User.class);
        Incident incident = mock(Incident.class);

        Pageable pageable = PageRequest.of(0, 20);

        when(userService.getActiveUser(email))
                .thenReturn(admin);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.of(incident));

        when(admin.getRole())
                .thenReturn(UserRole.ADMIN);

        when(auditLogRepository
                .findByIncidentIdOrderByCreatedAtAsc(
                        incidentId,
                        pageable
                ))
                .thenReturn(Page.empty(pageable));

        Page<?> response =
                auditService.getIncidentAudit(
                        incidentId,
                        email,
                        pageable
                );

        assertTrue(response.isEmpty());
    }
}
