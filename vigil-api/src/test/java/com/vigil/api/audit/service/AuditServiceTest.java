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