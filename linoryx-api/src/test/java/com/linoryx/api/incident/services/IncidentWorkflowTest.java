package com.linoryx.api.incident.services;

import com.linoryx.api.audit.service.AuditService;
import com.linoryx.api.incident.domain.*;
import com.linoryx.api.incident.dto.CreateIncidentRequest;
import com.linoryx.api.incident.repository.IncidentRepository;
import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.user.domain.*;
import com.linoryx.api.user.service.UserService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentWorkflowTest {
    @Mock IncidentRepository incidents;
    @Mock CustomerReportRepository reports;
    @Mock UserService users;
    @Mock AuditService audit;
    @InjectMocks IncidentService service;

    private User actor(UserRole role) {
        User actor = new User("actor@test.invalid", "hash", "Test", "Actor", role);
        ReflectionTestUtils.setField(actor, "id", 1L);
        when(users.getActiveUser(actor.getEmail())).thenReturn(actor);
        return actor;
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN"})
    void customersAndTechniciansCannotManageIncidents(UserRole role) {
        User actor = actor(role);
        CreateIncidentRequest request = new CreateIncidentRequest("Outage", "Details", Severity.HIGH, IncidentCategory.FIBER_FAILURE, List.of(1L));
        assertThrows(AccessDeniedException.class, () -> service.createIncident(request, actor.getEmail()));
        assertThrows(AccessDeniedException.class, () -> service.startProgress(1L, actor.getEmail()));
        assertThrows(AccessDeniedException.class, () -> service.closeIncident(1L, actor.getEmail()));
        assertThrows(AccessDeniedException.class, () -> service.changeCategory(1L, IncidentCategory.FIBER_FAILURE, actor.getEmail()));
        verifyNoInteractions(incidents, reports);
    }

    @Test
    void rejectsEmptyAndDuplicateReportSelections() {
        User actor = actor(UserRole.DISPATCHER);
        for (List<Long> ids : List.of(List.<Long>of(), List.of(1L, 1L))) {
            CreateIncidentRequest request = new CreateIncidentRequest("Outage", "Details", Severity.HIGH, IncidentCategory.FIBER_FAILURE, ids);
            assertThrows(IllegalArgumentException.class, () -> service.createIncident(request, actor.getEmail()));
        }
        verifyNoInteractions(incidents);
    }

    @Test
    void closedOrAlreadyLinkedReportsCannotBeSelected() {
        User actor = actor(UserRole.DISPATCHER);
        CustomerReport report = new CustomerReport(null, ReportCategory.NO_INTERNET, "No connection");
        report.linkTo(new Incident("Existing", "Details", Severity.HIGH, IncidentCategory.FIBER_FAILURE, actor));
        when(reports.findForUpdate(1L)).thenReturn(Optional.of(report));
        CreateIncidentRequest request = new CreateIncidentRequest("Outage", "Details", Severity.HIGH, IncidentCategory.FIBER_FAILURE, List.of(1L));
        assertThrows(IllegalStateException.class, () -> service.createIncident(request, actor.getEmail()));
        verifyNoInteractions(incidents);
    }

    @Test
    void historicalIncidentsCannotBeRecategorized() {
        User actor = actor(UserRole.DISPATCHER);
        Incident incident = new Incident("Historical", "Details", Severity.LOW, IncidentCategory.OTHER, actor);
        ReflectionTestUtils.setField(incident, "legacy", true);
        when(incidents.findForUpdate(1L)).thenReturn(Optional.of(incident));
        assertThrows(IllegalStateException.class, () -> service.changeCategory(1L, IncidentCategory.FIBER_FAILURE, actor.getEmail()));
        assertEquals(IncidentCategory.OTHER, incident.getCategory());
        verifyNoInteractions(audit, reports);
    }

    @Test
    void incidentHasOnlyThreeOrderedStatesAndNeedsNoTechnicianAssignment() {
        Incident incident = new Incident("Outage", "Details", Severity.HIGH, IncidentCategory.FIBER_FAILURE,
                new User("dispatcher@test.invalid", "hash", "Test", "Dispatcher", UserRole.DISPATCHER));
        assertThrows(IllegalStateException.class, incident::close);
        incident.startProgress();
        assertThrows(IllegalStateException.class, incident::startProgress);
        incident.close();
        assertEquals(IncidentStatus.CLOSED, incident.getStatus());
        assertNotNull(incident.getClosedAt());
        assertNull(incident.getAssignedTo());
        assertThrows(IllegalStateException.class, incident::startProgress);
    }
}
