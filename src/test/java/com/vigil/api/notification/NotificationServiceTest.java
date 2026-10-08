package com.vigil.api.notification;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private IncidentRepository incidentRepository;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void processIncidentAlerts_whenIncidentIsCritical_sendsCriticalAlert() {

        Incident incident = mock(Incident.class);
        User admin = mock(User.class);

        List<User> admins = List.of(admin);

        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN))
                .thenReturn(admins);

        when(incident.getSeverity())
                .thenReturn(Severity.CRITICAL);

        notificationService.processIncidentAlerts(incident);

        verify(emailService)
                .sendCriticalIncidentAlert(
                        incident,
                        admins
                );
    }

    @Test
    void processIncidentAlerts_whenThreeHighIncidentsExist_sendsThresholdAlert() {

        Incident incident = mock(Incident.class);
        User admin = mock(User.class);

        List<User> admins = List.of(admin);

        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN))
                .thenReturn(admins);

        when(incident.getSeverity())
                .thenReturn(Severity.HIGH);

        when(incidentRepository.countBySeverityAndStatusIn(
                Severity.HIGH,
                List.of(
                        IncidentStatus.OPEN,
                        IncidentStatus.IN_PROGRESS
                )
        )).thenReturn(3L);

        notificationService.processIncidentAlerts(incident);

        verify(emailService)
                .sendHighIncidentThresholdAlert(
                        3L,
                        admins
                );
    }

    @Test
    void processIncidentAlerts_whenIncidentIsMedium_doesNotSendAlert() {

        Incident incident = mock(Incident.class);
        User admin = mock(User.class);

        List<User> admins = List.of(admin);

        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN))
                .thenReturn(admins);

        when(incident.getSeverity())
                .thenReturn(Severity.MEDIUM);

        notificationService.processIncidentAlerts(incident);

        verifyNoInteractions(emailService);
    }
}