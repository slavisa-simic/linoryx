package com.vigil.api.notification;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.user.domain.User;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmailService {

    private static final Logger logger =
            LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String senderEmail;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username}") String senderEmail
    ) {
        this.mailSender = mailSender;
        this.senderEmail = senderEmail;
    }

    public void sendHighIncidentThresholdAlert(
            long activeHighIncidents,
            List<User> admins
    ) {

        for (User admin : admins) {

            SimpleMailMessage message =
                    new SimpleMailMessage();

            message.setFrom(senderEmail);
            message.setTo(admin.getEmail());

            message.setSubject(
                    "[VIGIL] High incident threshold reached"
            );

            message.setText(
                    "Vigil has detected a high number of active incidents.\n\n"
                            + "Active HIGH incidents: "
                            + activeHighIncidents
                            + "\n"
                            + "Threshold: 3\n\n"
                            + "Please review the active incident queue."
            );

            try {
                mailSender.send(message);
            }
            catch (MailException exception) {

                logger.error(
                        "Failed to send HIGH incident threshold alert to {}",
                        admin.getEmail(),
                        exception
                );
            }
        }
    }

    public void sendCriticalIncidentAlert(
            Incident incident,
            List<User> admins
    ) {

        for (User admin : admins) {

            SimpleMailMessage message =
                    new SimpleMailMessage();

            message.setFrom(senderEmail);
            message.setTo(admin.getEmail());

            message.setSubject(
                    "[VIGIL] Critical incident #" +
                            incident.getId()
            );

            message.setText(
                    "A critical incident has been created.\n\n" +

                            "Incident ID: " +
                            incident.getId() + "\n" +

                            "Title: " +
                            incident.getTitle() + "\n" +

                            "Category: " +
                            incident.getCategory() + "\n" +

                            "Severity: " +
                            incident.getSeverity() + "\n" +

                            "Status: " +
                            incident.getStatus() + "\n" +

                            "Created by: " +
                            incident.getCreatedBy().getFirstName() +
                            " " +
                            incident.getCreatedBy().getLastName()
            );

            try {
                mailSender.send(message);
            }
            catch (MailException exception) {

                logger.error(
                        "Failed to send critical incident email to {}",
                        admin.getEmail(),
                        exception
                );
            }
        }
    }
}