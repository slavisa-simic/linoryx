package com.linoryx.api.notification;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {
    @Mock JavaMailSender sender;

    @ParameterizedTest
    @CsvSource({"false, false", "true, true"})
    void disabledDeliveryAndDemoModeNeverContactProvider(boolean enabled, boolean demo) throws Exception {
        EmailService email = new EmailService(sender, "sender@test.invalid", "https://linoryx.example", enabled, demo);
        email.sendReportResolved(42L, "arbitrary@example.com");
        verifyNoInteractions(sender);
    }

    @Test
    void sendsTheReportLinkOnlyToItsOwner() throws Exception {
        MimeMessage message = new MimeMessage((Session) null);
        when(sender.createMimeMessage()).thenReturn(message);
        EmailService email = new EmailService(sender, "sender@test.invalid", "https://linoryx.example/", true, false);

        email.sendReportResolved(42L, "owner@test.invalid");
        message.saveChanges();

        verify(sender).send(message);
        assertEquals(1, message.getAllRecipients().length);
        assertEquals("owner@test.invalid", message.getAllRecipients()[0].toString());
        assertEquals("sender@test.invalid", message.getFrom()[0].toString());
        assertEquals("Linoryx — Your issue has been resolved", message.getSubject());
        String html = body(message, "text/html");
        String text = body(message, "text/plain");
        String reportUrl = "https://linoryx.example/reports?report=42";
        assertTrue(html.contains(reportUrl));
        assertTrue(text.contains(reportUrl));
        assertFalse(html.contains("token="));
        assertFalse(text.contains("token="));
    }

    private String body(Part part, String type) throws Exception {
        if (part.isMimeType(type)) return (String) part.getContent();
        if (part.getContent() instanceof Multipart multipart) {
            for (int index = 0; index < multipart.getCount(); index++) {
                String value = body(multipart.getBodyPart(index), type);
                if (!value.isEmpty()) return value;
            }
        }
        return "";
    }
}
