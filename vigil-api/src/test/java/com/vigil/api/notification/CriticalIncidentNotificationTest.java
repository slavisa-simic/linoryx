package com.vigil.api.notification;

import com.vigil.api.audit.service.AuditService;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.incident.services.IncidentService;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CriticalIncidentNotificationTest {
    @Mock private IncidentRepository incidentRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private AuditService auditService;
    @Mock private JavaMailSender mailSender;
    private IncidentService incidentService;
    private User creator;

    @BeforeEach
    void setUp() {
        EmailService emailService = new EmailService(mailSender, "alerts@test.com");
        NotificationService notifications = new NotificationService(userRepository, emailService, incidentRepository);
        incidentService = new IncidentService(incidentRepository, userRepository, userService, auditService, notifications);
        creator = new User("user@test.com", "hash", "Marko", "Petrovic", UserRole.USER);
        ReflectionTestUtils.setField(creator, "id", 3L);
        when(userService.getActiveUser(creator.getEmail())).thenReturn(creator);
        when(incidentRepository.save(any(Incident.class))).thenAnswer(invocation -> {
            Incident incident = invocation.getArgument(0);
            ReflectionTestUtils.setField(incident, "id", 91L);
            return incident;
        });
    }

    @Test
    void creatingCriticalIncidentSendsMailToAllEnabledAdminsBeforeReturning() {
        User admin = new User("admin@test.com", "hash", "Admin", "One", UserRole.ADMIN);
        User secondAdmin = new User("admin2@test.com", "hash", "Admin", "Two", UserRole.ADMIN);
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN)).thenReturn(List.of(admin, secondAdmin));

        var result = incidentService.createIncident(new CreateIncidentRequest(
                "Critical network outage", "All workstations are offline", Severity.CRITICAL, IncidentCategory.NETWORK
        ), creator.getEmail());

        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(2)).send(mail.capture());
        assertArrayEquals(new String[]{"admin@test.com"}, mail.getAllValues().get(0).getTo());
        assertArrayEquals(new String[]{"admin2@test.com"}, mail.getAllValues().get(1).getTo());
        assertEquals("[VIGIL] Critical incident #91", mail.getValue().getSubject());
        assertTrue(mail.getValue().getText().contains("Critical network outage"));
        assertTrue(mail.getValue().getText().contains("Marko Petrovic"));
        assertEquals(IncidentStatus.OPEN, result.status());
        var order = inOrder(incidentRepository, mailSender);
        order.verify(incidentRepository).save(any(Incident.class));
        order.verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    void mailFailureDoesNotDiscardIncidentOrStopOtherAdminNotifications() {
        User admin = new User("admin@test.com", "hash", "Admin", "One", UserRole.ADMIN);
        User secondAdmin = new User("admin2@test.com", "hash", "Admin", "Two", UserRole.ADMIN);
        when(userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN)).thenReturn(List.of(admin, secondAdmin));
        doThrow(new MailSendException("SMTP unavailable")).doNothing().when(mailSender).send(any(SimpleMailMessage.class));

        var result = incidentService.createIncident(new CreateIncidentRequest(
                "Critical outage", "All workstations are offline", Severity.CRITICAL, IncidentCategory.NETWORK
        ), creator.getEmail());

        assertEquals(91L, result.id());
        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }
}
