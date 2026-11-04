package com.vigil.api.incident.services;

import com.vigil.api.audit.service.AuditService;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.dto.IncidentResponse;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.notification.NotificationService;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentServiceTest {

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private UserService userService;

    @Mock
    private AuditService auditService;

    @Mock
    private NotificationService notificationService;

    @Mock private CustomerReportRepository reports;
    @InjectMocks
    private IncidentService incidentService;

    @Test
    void getIncident_whenIncidentDoesNotExist_throwsResourceNotFoundException() {

        Long incidentId = 999L;
        String currentUserEmail = "admin@example.com";

        User currentUser = mock(User.class);

        when(userService.getActiveUser(currentUserEmail))
                .thenReturn(currentUser);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> incidentService.getIncident(
                        incidentId,
                        currentUserEmail
                )
        );
    }

    @Test
    void getIncident_whenIncidentExists_returnsIncidentResponse() {

        Long incidentId = 1L;
        String currentUserEmail = "admin@test.com";

        User currentUser = mock(User.class);
        User creator = mock(User.class);
        Incident incident = mock(Incident.class);

        when(userService.getActiveUser(currentUserEmail))
                .thenReturn(currentUser);

        when(currentUser.getRole())
                .thenReturn(UserRole.ADMIN);

        when(incidentRepository.findById(incidentId))
                .thenReturn(Optional.of(incident));

        when(incident.getId())
                .thenReturn(incidentId);

        when(incident.getTitle())
                .thenReturn("Suspicious login attempts");

        when(incident.getCreatedBy())
                .thenReturn(creator);

        when(creator.getId())
                .thenReturn(10L);

        when(creator.getEmail())
                .thenReturn("user@test.com");

        IncidentResponse response =
                incidentService.getIncident(
                        incidentId,
                        currentUserEmail
                );

        assertEquals(1L, response.id());
        assertEquals(
                "Suspicious login attempts",
                response.title()
        );
    }

}
