package com.vigil.api.user.service;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class TechnicianManagementIntegrationTest {
    @Autowired private UserRepository userRepository;
    @Autowired private IncidentRepository incidentRepository;
    @Autowired private UserService userService;
    @Autowired private EntityManager entityManager;

    private User admin;
    private User technician;

    @BeforeEach
    void createUsers() {
        String prefix = "technician-test-" + UUID.randomUUID();
        admin = userRepository.save(new User(
                prefix + "-admin@example.invalid", "hash", "Test", "Admin", UserRole.ADMIN
        ));
        technician = userRepository.save(new User(
                prefix + "-tech@example.invalid", "hash", "Test", "Technician", UserRole.TECHNICIAN
        ));
    }

    @Test
    void activeIncidentBlocksDisablingAndChangingRole() {
        assignedIncident();
        Long technicianId = technician.getId();

        assertThrows(IllegalStateException.class,
                () -> userService.disableUser(admin.getEmail(), technicianId));
        assertThrows(IllegalStateException.class,
                () -> userService.changeUserRole(admin.getEmail(), technicianId, UserRole.USER));
        assertTrue(technician.isEnabled());
        assertEquals(UserRole.TECHNICIAN, technician.getRole());
    }

    @Test
    void closedIncidentAllowsManagementAndPreservesAssignment() {
        Incident incident = assignedIncident();
        incident.startProgress();
        incident.resolve();
        incident.close();
        incidentRepository.saveAndFlush(incident);
        Long technicianId = technician.getId();
        Long incidentId = incident.getId();

        assertFalse(userService.disableUser(admin.getEmail(), technicianId).enabled());
        assertEquals(UserRole.USER,
                userService.changeUserRole(admin.getEmail(), technicianId, UserRole.USER).role());

        entityManager.flush();
        entityManager.clear();
        Incident saved = incidentRepository.findById(incidentId).orElseThrow();
        assertEquals(IncidentStatus.CLOSED, saved.getStatus());
        assertEquals(technicianId, saved.getAssignedTo().getId());
    }

    private Incident assignedIncident() {
        Incident incident = new Incident(
                "Technician access test", "Test incident", Severity.LOW, IncidentCategory.OTHER, admin
        );
        incident.assignTo(technician);
        return incidentRepository.saveAndFlush(incident);
    }
}
