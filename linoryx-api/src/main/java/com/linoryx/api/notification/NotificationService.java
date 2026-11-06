package com.linoryx.api.notification;

import com.linoryx.api.report.domain.ReportResolvedEvent;
import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Service
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    private final EmailService emailService;

    public NotificationService(EmailService emailService) {
        this.emailService = emailService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReportResolved(ReportResolvedEvent event) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                emailService.sendReportResolved(event.reportId(), event.customerEmail());
                return;
            } catch (MailSendException exception) {
                // Provider exception text can include addresses and message content.
                logger.warn("Email delivery failed for report REP-{} (attempt {}/2)", event.reportId(), attempt);
                if (attempt == 2) {
                    return;
                }
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return;
                }
            } catch (MailException | MessagingException exception) {
                logger.warn("Email could not be prepared or sent for report REP-{}", event.reportId());
                return;
            }
        }
    }
}
