package com.vigil.api.report;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.service.AuditService;
import com.vigil.api.customerservice.domain.*;
import com.vigil.api.customerservice.repository.*;
import com.vigil.api.incident.domain.*;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.incident.services.IncidentService;
import com.vigil.api.location.domain.LocationData;
import com.vigil.api.network.domain.*;
import com.vigil.api.network.repository.NetworkNodeRepository;
import com.vigil.api.notification.EmailService;
import com.vigil.api.report.domain.*;
import com.vigil.api.report.dto.CreateReportRequest;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.report.service.CustomerReportService;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.technician.domain.TechnicianAvailability;
import com.vigil.api.technician.domain.TechnicianProfile;
import com.vigil.api.technician.repository.TechnicianProfileRepository;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class ReportConcurrencyIntegrationTest {
    @Autowired TechnicianProfileRepository profiles;
    @Autowired UserRepository users;
    @Autowired CustomerServiceRepository services;
    @Autowired ServiceLocationRepository locations;
    @Autowired NetworkNodeRepository nodes;
    @Autowired CustomerReportRepository reportRepository;
    @Autowired CustomerReportService reports;
    @Autowired IncidentRepository incidentRepository;
    @Autowired IncidentService incidents;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean EmailService email;
    @MockitoSpyBean AuditService audit;
    private TransactionTemplate transaction;
    private User dispatcher;
    private User customer;
    private User technician;
    private Long serviceId;
    private Long nodeId;
    private Long locationId;
    private Long incidentId;
    private Long reportId;
    private Long spareId;

    @BeforeEach
    void setupCommittedWorkflow() {
        transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            dispatcher = user(UserRole.DISPATCHER);
            customer = user(UserRole.USER);
            technician = user(UserRole.TECHNICIAN);
            TechnicianProfile profile = new TechnicianProfile(technician);
            profile.update(null, null, TechnicianAvailability.AVAILABLE, Set.of());
            profiles.save(profile);
            LocationData address = new LocationData("Concurrency Street 1", "Novi Sad", "RS", BigDecimal.ONE, BigDecimal.ONE);
            ServiceLocation location = locations.save(new ServiceLocation(address));
            NetworkNode node = nodes.save(new NetworkNode("TEST-" + UUID.randomUUID(), "Test", NodeType.ROUTER, address, NodeStatus.ACTIVE));
            CustomerService service = services.save(new CustomerService(customer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE));
            serviceId = service.getId();
            nodeId = node.getId();
            locationId = location.getId();
            reportId = reports.create(new CreateReportRequest(serviceId, ReportCategory.NO_INTERNET, "Offline"), customer.getEmail()).id();
            spareId = reports.create(new CreateReportRequest(serviceId, ReportCategory.SLOW_CONNECTION, "Slow"), customer.getEmail()).id();
            incidentId = incidents.createIncident(request(List.of(reportId)), dispatcher.getEmail()).id();
            incidents.startProgress(incidentId, dispatcher.getEmail());
            reports.assign(reportId, technician.getId(), dispatcher.getEmail());
            reports.start(reportId, technician.getEmail());
            reports.resolve(reportId, technician.getEmail());
            reports.confirmFixed(reportId, customer.getEmail());
        });
    }

    private User user(UserRole role) {
        return users.save(new User(UUID.randomUUID() + "@concurrency.invalid", "hash", "Test", role.name(), role));
    }

    private CreateIncidentRequest request(List<Long> ids) {
        return new CreateIncidentRequest("Concurrency test", "Details", Severity.LOW, IncidentCategory.NETWORK, ids);
    }

    @AfterEach
    void cleanupCommittedRecords() {
        reset(audit);
        jdbc.update("DELETE FROM audit_logs WHERE report_id IN (?, ?) OR incident_id = ?", reportId, spareId, incidentId);
        jdbc.update("DELETE FROM customer_reports WHERE id IN (?, ?)", reportId, spareId);
        jdbc.update("DELETE FROM incidents WHERE id = ?", incidentId);
        jdbc.update("DELETE FROM customer_services WHERE id = ?", serviceId);
        jdbc.update("DELETE FROM network_nodes WHERE id = ?", nodeId);
        jdbc.update("DELETE FROM service_locations WHERE id = ?", locationId);
        jdbc.update("DELETE FROM technician_profiles WHERE user_id = ?", technician.getId());
        jdbc.update("DELETE FROM users WHERE id IN (?, ?, ?)", dispatcher.getId(), customer.getId(), technician.getId());
    }

    @Test
    void attachingCannotRacePastIncidentClosure() throws Exception {
        reports.close(reportId, dispatcher.getEmail());
        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            Future<?>[] pending = new Future<?>[1];
            transaction.executeWithoutResult(status -> {
                incidentRepository.findForUpdate(incidentId).orElseThrow();
                pending[0] = executor.submit(() -> incidents.attachReports(incidentId, List.of(spareId), dispatcher.getEmail()));
                assertThrows(TimeoutException.class, () -> pending[0].get(200, TimeUnit.MILLISECONDS));
                incidents.closeIncident(incidentId, dispatcher.getEmail());
            });
            ExecutionException rejected = assertThrows(ExecutionException.class, () -> pending[0].get(5, TimeUnit.SECONDS));
            assertInstanceOf(IllegalStateException.class, rejected.getCause());
        }
        assertEquals(IncidentStatus.CLOSED, incidentRepository.findById(incidentId).orElseThrow().getStatus());
        assertNull(reportRepository.findIncidentId(spareId));
    }

    @Test
    void customerFeedbackCannotRacePastReportClosure() throws Exception {
        try (ExecutorService executor = Executors.newSingleThreadExecutor()) {
            Future<?>[] pending = new Future<?>[1];
            transaction.executeWithoutResult(status -> {
                incidentRepository.findForUpdate(incidentId).orElseThrow();
                pending[0] = executor.submit(() -> reports.stillNotWorking(reportId, customer.getEmail()));
                assertThrows(TimeoutException.class, () -> pending[0].get(200, TimeUnit.MILLISECONDS));
                reports.close(reportId, dispatcher.getEmail());
            });
            ExecutionException rejected = assertThrows(ExecutionException.class, () -> pending[0].get(5, TimeUnit.SECONDS));
            assertInstanceOf(IllegalStateException.class, rejected.getCause());
        }
        assertEquals(ReportStatus.CLOSED, reportRepository.findById(reportId).orElseThrow().getStatus());
    }

    @Test
    void anAuditFailureRollsBackIncidentCreationAndReportLinks() {
        long before = incidentRepository.count();
        doThrow(new IllegalStateException("Test audit failure")).when(audit)
                .logReport(any(), any(), eq(AuditAction.REPORT_LINKED));
        assertThrows(IllegalStateException.class, () -> incidents.createIncident(request(List.of(spareId)), dispatcher.getEmail()));
        assertEquals(before, incidentRepository.count());
        assertNull(reportRepository.findIncidentId(spareId));
    }
}
