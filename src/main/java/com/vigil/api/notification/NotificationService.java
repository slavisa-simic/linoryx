package com.vigil.api.notification;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final EmailService emailService;

    public NotificationService(
            UserRepository userRepository,
            EmailService emailService,
            IncidentRepository incidentRepository
    ) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.incidentRepository = incidentRepository;
    }

    public void notifyCriticalIncident(
            Incident incident
    ) {

        List<User> admins =
                userRepository.findAllByRoleAndEnabledTrue(
                        UserRole.ADMIN
                );

        emailService.sendCriticalIncidentAlert(
                incident,
                admins
        );
    }

    public void processIncidentAlerts(Incident incident) {

        List<User> admins =
                userRepository.findAllByRoleAndEnabledTrue(
                        UserRole.ADMIN
                );

        if (incident.getSeverity() == Severity.CRITICAL) {

            emailService.sendCriticalIncidentAlert(
                    incident,
                    admins
            );

            return;
        }

        if (incident.getSeverity() == Severity.HIGH) {

            long activeHighIncidents =
                    incidentRepository.countBySeverityAndStatusIn(
                            Severity.HIGH,
                            List.of(
                                    IncidentStatus.OPEN,
                                    IncidentStatus.IN_PROGRESS
                            )
                    );

            if (activeHighIncidents >= 3) {

                emailService.sendHighIncidentThresholdAlert(
                        activeHighIncidents,
                        admins
                );
            }
        }
    }
}