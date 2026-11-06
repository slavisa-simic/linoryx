package com.linoryx.api.notification;

import com.linoryx.api.customerservice.domain.*;
import com.linoryx.api.customerservice.repository.*;
import com.linoryx.api.incident.domain.*;
import com.linoryx.api.incident.dto.CreateIncidentRequest;
import com.linoryx.api.incident.services.IncidentService;
import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.network.domain.*;
import com.linoryx.api.network.repository.NetworkNodeRepository;
import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.dto.CreateReportRequest;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.report.service.CustomerReportService;
import com.linoryx.api.technician.domain.*;
import com.linoryx.api.technician.repository.TechnicianProfileRepository;
import com.linoryx.api.user.domain.*;
import com.linoryx.api.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class ReportResolvedNotificationIntegrationTest {
    @Autowired UserRepository users;
    @Autowired TechnicianProfileRepository profiles;
    @Autowired CustomerServiceRepository services;
    @Autowired ServiceLocationRepository locations;
    @Autowired NetworkNodeRepository nodes;
    @Autowired CustomerReportRepository reportRepository;
    @Autowired CustomerReportService reports;
    @Autowired IncidentService incidents;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean EmailService email;
    private TransactionTemplate transaction;
    private User customer;
    private User otherCustomer;
    private User dispatcher;
    private User technician;
    private Long serviceId;
    private Long otherServiceId;
    private Long nodeId;
    private Long locationId;
    private Long incidentId;
    private Long reportId;
    private Long otherReportId;

    @BeforeEach
    void createCommittedReports() {
        transaction = new TransactionTemplate(transactionManager);
        transaction.executeWithoutResult(status -> {
            customer = user(UserRole.USER);
            otherCustomer = user(UserRole.USER);
            dispatcher = user(UserRole.DISPATCHER);
            technician = user(UserRole.TECHNICIAN);
            TechnicianProfile profile = new TechnicianProfile(technician);
            profile.update(null, null, TechnicianAvailability.AVAILABLE, Set.of());
            profiles.save(profile);
            LocationData address = new LocationData("Email Test Street", "Novi Sad", "RS", BigDecimal.ONE, BigDecimal.ONE);
            ServiceLocation location = locations.save(new ServiceLocation(address));
            NetworkNode node = nodes.save(new NetworkNode("EMAIL-" + UUID.randomUUID(), "Email test", NodeType.ROUTER, address, NodeStatus.ACTIVE));
            serviceId = services.save(new CustomerService(customer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE)).getId();
            otherServiceId = services.save(new CustomerService(otherCustomer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE)).getId();
            nodeId = node.getId();
            locationId = location.getId();
            reportId = reports.create(new CreateReportRequest(serviceId, ReportCategory.NO_INTERNET, "Offline"), customer.getEmail()).id();
            otherReportId = reports.create(new CreateReportRequest(otherServiceId, ReportCategory.NO_INTERNET, "Offline"), otherCustomer.getEmail()).id();
            incidentId = incidents.createIncident(new CreateIncidentRequest("Email test", "Details", Severity.CRITICAL,
                    IncidentCategory.FIBER_FAILURE, List.of(reportId, otherReportId)), dispatcher.getEmail()).id();
            incidents.startProgress(incidentId, dispatcher.getEmail());
            reports.assign(reportId, technician.getId(), dispatcher.getEmail());
            reports.assign(otherReportId, technician.getId(), dispatcher.getEmail());
            reports.start(reportId, technician.getEmail());
            reports.start(otherReportId, technician.getEmail());
        });
    }

    private User user(UserRole role) {
        return users.save(new User(UUID.randomUUID() + "@email-test.invalid", "hash", "Test", role.name(), role));
    }

    @AfterEach
    void removeTestRecords() {
        jdbc.update("DELETE FROM audit_logs WHERE incident_id = ? OR report_id IN (?, ?)", incidentId, reportId, otherReportId);
        jdbc.update("DELETE FROM customer_reports WHERE id IN (?, ?)", reportId, otherReportId);
        jdbc.update("DELETE FROM incidents WHERE id = ?", incidentId);
        jdbc.update("DELETE FROM customer_services WHERE id IN (?, ?)", serviceId, otherServiceId);
        jdbc.update("DELETE FROM network_nodes WHERE id = ?", nodeId);
        jdbc.update("DELETE FROM service_locations WHERE id = ?", locationId);
        jdbc.update("DELETE FROM technician_profiles WHERE user_id = ?", technician.getId());
        jdbc.update("DELETE FROM users WHERE id IN (?, ?, ?, ?)", customer.getId(), otherCustomer.getId(), dispatcher.getId(), technician.getId());
    }

    @Test
    void criticalIncidentCreationAndAssignmentDoNotSendEmail() throws Exception {
        verify(email, after(200).never()).sendReportResolved(anyLong(), anyString());
    }

    @Test
    void resolutionNotifiesOnlyTheOwnerOfThatReport() throws Exception {
        reports.resolve(reportId, technician.getEmail());
        verify(email, timeout(3000)).sendReportResolved(reportId, customer.getEmail());
        verifyNoMoreInteractions(email);
        assertEquals(ReportStatus.IN_PROGRESS, reportRepository.findById(otherReportId).orElseThrow().getStatus());
    }

    @Test
    void repeatedResolveDoesNotSendAnotherEmail() throws Exception {
        reports.resolve(reportId, technician.getEmail());
        assertThrows(IllegalStateException.class, () -> reports.resolve(reportId, technician.getEmail()));
        verify(email, timeout(3000)).sendReportResolved(reportId, customer.getEmail());
        verify(email, after(200).times(1)).sendReportResolved(anyLong(), anyString());
    }

    @Test
    void stillNotWorkingAllowsAnotherNotificationOnTheNextResolution() throws Exception {
        reports.resolve(reportId, technician.getEmail());
        verify(email, timeout(3000)).sendReportResolved(reportId, customer.getEmail());
        reports.stillNotWorking(reportId, customer.getEmail());
        reports.resolve(reportId, technician.getEmail());
        verify(email, timeout(3000).times(2)).sendReportResolved(reportId, customer.getEmail());
        verifyNoMoreInteractions(email);
    }

    @Test
    void rolledBackResolutionDoesNotSendEmail() throws Exception {
        transaction.executeWithoutResult(status -> {
            reports.resolve(reportId, technician.getEmail());
            status.setRollbackOnly();
        });
        assertEquals(ReportStatus.IN_PROGRESS, reportRepository.findById(reportId).orElseThrow().getStatus());
        verify(email, after(200).never()).sendReportResolved(anyLong(), anyString());
    }

    @Test
    void notificationWaitsForTheOuterTransactionToCommit() throws Exception {
        transaction.executeWithoutResult(status -> {
            reports.resolve(reportId, technician.getEmail());
            verifyNoInteractions(email);
        });
        verify(email, timeout(3000)).sendReportResolved(reportId, customer.getEmail());
    }

    @Test
    void providerOutageDoesNotRollBackTheResolution() throws Exception {
        doThrow(new MailSendException("Unavailable")).when(email).sendReportResolved(reportId, customer.getEmail());
        assertEquals(ReportStatus.RESOLVED, reports.resolve(reportId, technician.getEmail()).status());
        verify(email, timeout(4000).times(2)).sendReportResolved(reportId, customer.getEmail());
        assertEquals(ReportStatus.RESOLVED, reportRepository.findById(reportId).orElseThrow().getStatus());
    }

    @Test
    void slowProviderDoesNotBlockResolution() throws Exception {
        CountDownLatch deliveryStarted = new CountDownLatch(1);
        CountDownLatch finishDelivery = new CountDownLatch(1);
        doAnswer(invocation -> {
            deliveryStarted.countDown();
            assertTrue(finishDelivery.await(5, TimeUnit.SECONDS));
            return null;
        }).when(email).sendReportResolved(reportId, customer.getEmail());

        try {
            assertTimeoutPreemptively(java.time.Duration.ofSeconds(2), () -> reports.resolve(reportId, technician.getEmail()));
            assertTrue(deliveryStarted.await(3, TimeUnit.SECONDS));
            assertEquals(ReportStatus.RESOLVED, reportRepository.findById(reportId).orElseThrow().getStatus());
        } finally {
            finishDelivery.countDown();
        }
    }

    @Test
    void concurrentResolveRequestsSendOneNotification() throws Exception {
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Boolean> first = executor.submit(this::tryResolve);
            Future<Boolean> second = executor.submit(this::tryResolve);
            assertNotEquals(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
        }
        verify(email, timeout(3000)).sendReportResolved(reportId, customer.getEmail());
        verify(email, after(200).times(1)).sendReportResolved(anyLong(), anyString());
    }

    private boolean tryResolve() {
        try {
            reports.resolve(reportId, technician.getEmail());
            return true;
        } catch (IllegalStateException exception) {
            return false;
        }
    }

    @Test
    void unauthorizedResolutionDoesNotSendEmail() throws Exception {
        assertThrows(AccessDeniedException.class, () -> reports.resolve(reportId, dispatcher.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.resolve(reportId, otherCustomer.getEmail()));
        verify(email, after(200).never()).sendReportResolved(anyLong(), anyString());
    }

    @Test
    void closingReportsAndIncidentDoesNotSendEmail() throws Exception {
        reports.resolve(reportId, technician.getEmail());
        reports.resolve(otherReportId, technician.getEmail());
        verify(email, timeout(3000)).sendReportResolved(reportId, customer.getEmail());
        verify(email, timeout(3000)).sendReportResolved(otherReportId, otherCustomer.getEmail());
        clearInvocations(email);
        reports.confirmFixed(reportId, customer.getEmail());
        reports.confirmFixed(otherReportId, otherCustomer.getEmail());
        reports.close(reportId, dispatcher.getEmail());
        reports.close(otherReportId, dispatcher.getEmail());
        incidents.closeIncident(incidentId, dispatcher.getEmail());
        verify(email, after(200).never()).sendReportResolved(anyLong(), anyString());
    }
}
