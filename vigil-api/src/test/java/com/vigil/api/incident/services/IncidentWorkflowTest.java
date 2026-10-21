package com.vigil.api.incident.services;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.notification.NotificationService;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentWorkflowTest {
    @Mock private IncidentRepository incidentRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;
    @Mock private AuditService auditService;
    @Mock private NotificationService notificationService;
    @InjectMocks private IncidentService service;

    private User user(long id, UserRole role) {
        User user = new User("user" + id + "@test.com", "hash", "First", "Last", role);
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private Incident incident(User creator) {
        Incident incident = new Incident("Connection lost", "Network unavailable", Severity.HIGH, IncidentCategory.NETWORK, creator);
        ReflectionTestUtils.setField(incident, "id", 10L);
        return incident;
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void listsOnlyIncidentsVisibleToCurrentRole(UserRole role) {
        User current = user(7L, role);
        when(userService.getActiveUser(current.getEmail())).thenReturn(current);
        Long technicianId = role == UserRole.TECHNICIAN ? 7L : null;
        Long creatorId = role == UserRole.USER ? 7L : null;
        PageRequest page = PageRequest.of(0, 20);
        when(incidentRepository.findVisibleIncidents(technicianId, creatorId, null, null, null, "network", page)).thenReturn(Page.empty());

        service.getAllIncidents(null, null, null, " network ", current.getEmail(), page);

        verify(incidentRepository).findVisibleIncidents(technicianId, creatorId, null, null, null, "network", page);
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void onlyAdministratorCanAssign(UserRole role) {
        User current = user(7L, role);
        when(userService.getActiveUser(current.getEmail())).thenReturn(current);
        assertThrows(AccessDeniedException.class, () -> service.assignIncident(10L, 8L, current.getEmail()));
        verifyNoInteractions(incidentRepository, userRepository);
    }

    @Test
    void technicianCannotCreateAnIncident() {
        User technician = user(7L, UserRole.TECHNICIAN);
        when(userService.getActiveUser(technician.getEmail())).thenReturn(technician);
        var request = new CreateIncidentRequest("Issue", "Details", Severity.LOW, IncidentCategory.OTHER);
        assertThrows(AccessDeniedException.class, () -> service.createIncident(request, technician.getEmail()));
        verifyNoInteractions(incidentRepository);
    }

    @Test
    void assignedTechnicianCanCompleteTheWorkflow() {
        User technician = user(7L, UserRole.TECHNICIAN);
        Incident incident = incident(user(2L, UserRole.USER));
        incident.assignTo(technician);
        when(userService.getActiveUser(technician.getEmail())).thenReturn(technician);
        when(incidentRepository.findById(10L)).thenReturn(Optional.of(incident));
        when(incidentRepository.save(incident)).thenReturn(incident);

        assertEquals(IncidentStatus.IN_PROGRESS, service.startProgress(10L, technician.getEmail()).status());
        assertEquals(IncidentStatus.RESOLVED, service.resolveIncident(10L, technician.getEmail()).status());
        assertEquals(IncidentStatus.CLOSED, service.closeIncident(10L, technician.getEmail()).status());
        assertNotNull(incident.getResolvedAt());
        verify(auditService).log(incident, technician, AuditAction.CLOSED);
    }

    @Test
    void technicianCannotWorkOnAnotherTechniciansIncident() {
        User technician = user(7L, UserRole.TECHNICIAN);
        Incident incident = incident(user(2L, UserRole.USER));
        incident.assignTo(user(8L, UserRole.TECHNICIAN));
        when(userService.getActiveUser(technician.getEmail())).thenReturn(technician);
        when(incidentRepository.findById(10L)).thenReturn(Optional.of(incident));

        assertThrows(AccessDeniedException.class, () -> service.startProgress(10L, technician.getEmail()));
        assertThrows(AccessDeniedException.class, () -> service.resolveIncident(10L, technician.getEmail()));
        assertThrows(AccessDeniedException.class, () -> service.closeIncident(10L, technician.getEmail()));
        verify(incidentRepository, never()).save(any());
    }

    @Test
    void userCannotReadAnotherUsersIncident() {
        User current = user(7L, UserRole.USER);
        when(userService.getActiveUser(current.getEmail())).thenReturn(current);
        when(incidentRepository.findById(10L)).thenReturn(Optional.of(incident(user(2L, UserRole.USER))));
        assertThrows(AccessDeniedException.class, () -> service.getIncident(10L, current.getEmail()));
    }

    @Test
    void administratorCanWorkOnAnAssignedIncident() {
        User admin = user(1L, UserRole.ADMIN);
        Incident incident = incident(user(2L, UserRole.USER));
        incident.assignTo(user(8L, UserRole.TECHNICIAN));
        when(userService.getActiveUser(admin.getEmail())).thenReturn(admin);
        when(incidentRepository.findById(10L)).thenReturn(Optional.of(incident));
        when(incidentRepository.save(incident)).thenReturn(incident);
        assertEquals(IncidentStatus.IN_PROGRESS, service.startProgress(10L, admin.getEmail()).status());
    }

    @Test
    void cannotSkipWorkflowSteps() {
        Incident incident = incident(user(2L, UserRole.USER));
        assertThrows(IllegalStateException.class, incident::startProgress);
        assertThrows(IllegalStateException.class, incident::resolve);
        assertThrows(IllegalStateException.class, incident::close);
        assertEquals(IncidentStatus.OPEN, incident.getStatus());
    }

    @Test
    void cannotAssignDisabledTechnician() {
        User admin = user(1L, UserRole.ADMIN);
        User technician = user(8L, UserRole.TECHNICIAN);
        technician.disable();
        when(userService.getActiveUser(admin.getEmail())).thenReturn(admin);
        when(userRepository.findById(8L)).thenReturn(Optional.of(technician));
        when(incidentRepository.findById(10L)).thenReturn(Optional.of(incident(user(2L, UserRole.USER))));
        assertThrows(IllegalStateException.class, () -> service.assignIncident(10L, 8L, admin.getEmail()));
        verify(incidentRepository, never()).save(any());
    }
}
