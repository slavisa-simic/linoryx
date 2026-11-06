package com.linoryx.api.notification;

import com.linoryx.api.report.domain.ReportResolvedEvent;
import jakarta.mail.MessagingException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {
    @Mock EmailService email;
    @InjectMocks NotificationService notifications;
    private final ReportResolvedEvent event = new ReportResolvedEvent(42L, "customer@test.invalid");

    @Test
    void successfulDeliveryIsNotRetried() throws Exception {
        notifications.onReportResolved(event);
        verify(email).sendReportResolved(42L, "customer@test.invalid");
        verifyNoMoreInteractions(email);
    }

    @Test
    void temporaryFailureIsRetriedOnce() throws Exception {
        doThrow(new MailSendException("Unavailable")).doNothing().when(email)
                .sendReportResolved(42L, "customer@test.invalid");
        notifications.onReportResolved(event);
        verify(email, times(2)).sendReportResolved(42L, "customer@test.invalid");
    }

    @Test
    void providerOutageStopsAfterTwoAttempts() throws Exception {
        doThrow(new MailSendException("Unavailable")).when(email)
                .sendReportResolved(42L, "customer@test.invalid");
        assertDoesNotThrow(() -> notifications.onReportResolved(event));
        verify(email, times(2)).sendReportResolved(42L, "customer@test.invalid");
    }

    @Test
    void authenticationFailureIsNotRetried() throws Exception {
        doThrow(new MailAuthenticationException("Invalid credentials")).when(email)
                .sendReportResolved(42L, "customer@test.invalid");
        assertDoesNotThrow(() -> notifications.onReportResolved(event));
        verify(email).sendReportResolved(42L, "customer@test.invalid");
    }

    @Test
    void invalidMessageIsNotRetried() throws Exception {
        doThrow(new MessagingException("Invalid message")).when(email)
                .sendReportResolved(42L, "customer@test.invalid");
        assertDoesNotThrow(() -> notifications.onReportResolved(event));
        verify(email).sendReportResolved(42L, "customer@test.invalid");
    }
}
