package com.linoryx.api.notification;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
public class EmailService {
    private final JavaMailSender mailSender;
    private final String senderEmail;
    private final String frontendUrl;
    private final boolean enabled;
    private final boolean demoMode;
    private final String template;

    public EmailService(JavaMailSender mailSender,
                        @Value("${spring.mail.username}") String senderEmail,
                        @Value("${notification.frontend-url}") String frontendUrl,
                        @Value("${notification.email-enabled}") boolean enabled,
                        @Value("${notification.demo-mode}") boolean demoMode) throws IOException {
        this.mailSender = mailSender;
        this.senderEmail = senderEmail;
        this.frontendUrl = frontendUrl.endsWith("/") ? frontendUrl.substring(0, frontendUrl.length() - 1) : frontendUrl;
        this.enabled = enabled;
        this.demoMode = demoMode;
        this.template = new ClassPathResource("templates/report-resolved.html")
                .getContentAsString(StandardCharsets.UTF_8);
    }

    public void sendReportResolved(Long reportId, String customerEmail) throws MessagingException {
        if (!enabled || demoMode) {
            return;
        }

        String reportUrl = frontendUrl + "/reports?report=" + reportId;
        String html = template.replace("{{reportId}}", reportId.toString())
                .replace("{{reportUrl}}", HtmlUtils.htmlEscape(reportUrl));
        String text = "Your connection may be restored\n\n"
                + "Our technician has marked your reported issue as resolved.\n\n"
                + "Report: REP-" + reportId + "\nStatus: RESOLVED\n\n"
                + "Please sign in to Linoryx to confirm whether your connection is working correctly.\n"
                + "Review Your Report: " + reportUrl + "\n\n"
                + "This is an automated notification from Linoryx. Please do not reply.";

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        helper.setFrom(senderEmail);
        helper.setTo(customerEmail);
        helper.setSubject("Linoryx — Your issue has been resolved");
        helper.setText(text, html);
        mailSender.send(message);
    }
}
