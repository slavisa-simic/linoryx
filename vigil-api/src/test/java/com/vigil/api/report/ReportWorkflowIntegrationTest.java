package com.vigil.api.report;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.comment.dto.CreateCommentRequest;
import com.vigil.api.comment.service.CommentService;
import com.vigil.api.customerservice.domain.*;
import com.vigil.api.customerservice.repository.*;
import com.vigil.api.incident.domain.*;
import com.vigil.api.incident.dto.*;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.incident.services.IncidentService;
import com.vigil.api.location.domain.LocationData;
import com.vigil.api.network.domain.*;
import com.vigil.api.network.repository.NetworkNodeRepository;
import com.vigil.api.notification.EmailService;
import com.vigil.api.report.domain.*;
import com.vigil.api.report.dto.*;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.report.service.CustomerReportService;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class ReportWorkflowIntegrationTest {
    @Autowired UserRepository users;
    @Autowired UserService userService;
    @Autowired CustomerServiceRepository services;
    @Autowired ServiceLocationRepository locations;
    @Autowired NetworkNodeRepository nodes;
    @Autowired CustomerReportRepository reportRepository;
    @Autowired CustomerReportService reports;
    @Autowired IncidentService incidents;
    @Autowired IncidentRepository incidentRepository;
    @Autowired CommentService comments;
    @Autowired AuditLogRepository audit;
    @Autowired EntityManager entityManager;
    @Autowired javax.sql.DataSource dataSource;
    @MockitoBean EmailService email;
    User customer;
    User otherCustomer;
    User dispatcher;
    User otherDispatcher;
    User technician;
    User otherTechnician;
    User admin;
    CustomerService service;
    CustomerService otherService;

    @BeforeEach
    void setup() {
        customer = user(UserRole.USER);
        otherCustomer = user(UserRole.USER);
        dispatcher = user(UserRole.DISPATCHER);
        otherDispatcher = user(UserRole.DISPATCHER);
        technician = user(UserRole.TECHNICIAN);
        otherTechnician = user(UserRole.TECHNICIAN);
        admin = user(UserRole.ADMIN);
        LocationData address = new LocationData("Main Street 42", "Novi Sad", "RS", new BigDecimal("45.25"), new BigDecimal("19.84"));
        ServiceLocation location = locations.save(new ServiceLocation(address));
        NetworkNode node = nodes.save(new NetworkNode("TEST-" + UUID.randomUUID(), "Test OLT", NodeType.GPON_OLT, address, NodeStatus.ACTIVE));
        service = services.save(new CustomerService(customer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE));
        otherService = services.save(new CustomerService(otherCustomer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE));
    }

    private User user(UserRole role) {
        return users.save(new User(UUID.randomUUID() + "@test.invalid", "hash", "Test", role.name(), role));
    }

    private ReportResponse report(CustomerService service, User customer) {
        return reports.create(new CreateReportRequest(service.getId(), ReportCategory.NO_INTERNET, "No connection"), customer.getEmail());
    }

    private IncidentResponse incident(Long... ids) {
        return incidents.createIncident(new CreateIncidentRequest("Fiber outage", "Investigate customer reports", Severity.HIGH,
                IncidentCategory.NETWORK, List.of(ids)), dispatcher.getEmail());
    }

    private Long resolvedReport() {
        Long id = report(service, customer).id();
        IncidentResponse incident = incident(id);
        incidents.startProgress(incident.id(), dispatcher.getEmail());
        reports.assign(id, technician.getId(), dispatcher.getEmail());
        reports.start(id, technician.getEmail());
        reports.resolve(id, technician.getEmail());
        return id;
    }

    @Test
    void ownActiveServiceCreatesAnOpenPrivateReport() {
        ReportResponse report = report(service, customer);
        entityManager.flush();
        assertEquals(ReportStatus.OPEN, report.status());
        assertFalse(report.userConfirmed());
        assertNull(report.incidentId());
        assertNull(report.assignedTechnicianId());
        assertNull(report.customerEmail());
        assertNull(report.networkNodeCode());
        CustomerReport saved = reportRepository.findById(report.id()).orElseThrow();
        assertNull(saved.getIncident());
        assertNull(saved.getAssignedTechnician());
        assertEquals("Main Street 42", report.serviceAddress());
        assertEquals(1, reports.list(customer.getEmail(), "my", null, null, null, PageRequest.of(0, 20)).getTotalElements());
        assertEquals(0, reports.list(otherCustomer.getEmail(), "my", null, null, null, PageRequest.of(0, 20)).getTotalElements());
    }

    @Test
    void cannotReportAnotherCustomersService() {
        assertThrows(AccessDeniedException.class, () -> report(otherService, customer));
    }

    @Test
    void inactiveServicesCannotBeReported() {
        service.terminate();
        assertThrows(IllegalStateException.class, () -> report(service, customer));
    }

    @Test
    void invalidDescriptionsAndCategoriesAreRejectedInTheDomain() {
        assertThrows(IllegalArgumentException.class, () -> new CustomerReport(service, null, "Details"));
        assertThrows(IllegalArgumentException.class, () -> new CustomerReport(service, ReportCategory.OTHER, " "));
        assertThrows(IllegalArgumentException.class, () -> new CustomerReport(service, ReportCategory.OTHER, "x".repeat(501)));
    }

    @Test
    void fullTwoCustomerTwoTechnicianAcceptanceScenario() {
        Long first = report(service, customer).id();
        Long second = report(otherService, otherCustomer).id();
        IncidentResponse incident = incident(first, second);
        assertEquals(dispatcher.getId(), incident.createdById());
        assertEquals(2, incident.reportCount());
        assertNull(incident.assignedToId());
        assertEquals(IncidentStatus.OPEN, incident.status());
        incidents.startProgress(incident.id(), otherDispatcher.getEmail());
        reports.assign(first, technician.getId(), dispatcher.getEmail());
        reports.assign(second, otherTechnician.getId(), otherDispatcher.getEmail());
        var visibleIncidents = incidents.getAllIncidents(null, null, null, null, technician.getEmail(), PageRequest.of(0, 20));
        assertEquals(1, visibleIncidents.getTotalElements());
        assertEquals(2, visibleIncidents.getContent().getFirst().reportCount());
        reports.start(first, technician.getEmail());
        reports.start(second, otherTechnician.getEmail());
        reports.resolve(first, technician.getEmail());
        reports.resolve(second, otherTechnician.getEmail());
        assertTrue(reports.confirmFixed(first, customer.getEmail()).userConfirmed());
        reports.close(first, dispatcher.getEmail());
        ReportResponse rejected = reports.stillNotWorking(second, otherCustomer.getEmail());
        assertEquals(ReportStatus.IN_PROGRESS, rejected.status());
        assertTrue(rejected.customerReportedUnfixed());
        assertNull(rejected.resolvedAt());
        assertFalse(rejected.userConfirmed());
        assertEquals(IncidentStatus.IN_PROGRESS, incidents.getIncident(incident.id(), dispatcher.getEmail()).status());
        reports.resolve(second, otherTechnician.getEmail());
        assertFalse(reportRepository.findById(second).orElseThrow().isUserConfirmed());
        reports.confirmFixed(second, otherCustomer.getEmail());
        reports.close(second, otherDispatcher.getEmail());
        assertEquals(IncidentStatus.IN_PROGRESS, incidentRepository.findById(incident.id()).orElseThrow().getStatus());
        assertEquals(IncidentStatus.CLOSED, incidents.closeIncident(incident.id(), otherDispatcher.getEmail()).status());
        entityManager.flush();
        List<AuditAction> actions = audit.findByIncidentIdOrderByCreatedAtAsc(incident.id(), PageRequest.of(0, 100))
                .map(entry -> entry.getAction()).getContent();
        assertTrue(actions.containsAll(List.of(AuditAction.CREATED, AuditAction.REPORT_LINKED, AuditAction.REPORT_ASSIGNED,
                AuditAction.REPORT_STARTED, AuditAction.REPORT_RESOLVED, AuditAction.CUSTOMER_CONFIRMED,
                AuditAction.CUSTOMER_STILL_NOT_WORKING, AuditAction.REPORT_CLOSED, AuditAction.CLOSED)));
        assertTrue(audit.findByIncidentIdOrderByCreatedAtAsc(incident.id(), PageRequest.of(0, 100)).stream()
                .allMatch(entry -> entry.getActor() != null));
    }

    @Test
    void oneReportCanCreateAnIncidentAndMoreCanBeAttached() {
        Long first = report(service, customer).id();
        IncidentResponse incident = incident(first);
        Long second = report(otherService, otherCustomer).id();
        assertEquals(2, incidents.attachReports(incident.id(), List.of(second), otherDispatcher.getEmail()).reportCount());
        assertEquals(incident.id(), reportRepository.findById(second).orElseThrow().getIncident().getId());
    }

    @Test
    void invalidSelectionDoesNotCreateAnIncidentOrLinkEarlierReports() {
        Long first = report(service, customer).id();
        long count = incidentRepository.count();
        assertThrows(RuntimeException.class, () -> incident(first, Long.MAX_VALUE));
        assertEquals(count, incidentRepository.count());
        assertNull(reportRepository.findById(first).orElseThrow().getIncident());
    }

    @Test
    void linkedAndClosedReportsCannotBeAttachedAgain() {
        Long first = report(service, customer).id();
        incident(first);
        assertThrows(IllegalStateException.class, () -> incident(first));
        CustomerReport closed = new CustomerReport(service, ReportCategory.OTHER, "Historical test report");
        closed.start();
        closed.resolve();
        closed.confirmFixed();
        closed.close();
        reportRepository.saveAndFlush(closed);
        assertThrows(IllegalStateException.class, () -> incident(closed.getId()));
    }

    @Test
    void onlyAssignedTechnicianCanWorkAndIncidentMustBeStarted() {
        Long id = report(service, customer).id();
        IncidentResponse incident = incident(id);
        reports.assign(id, technician.getId(), dispatcher.getEmail());
        assertThrows(IllegalStateException.class, () -> reports.start(id, technician.getEmail()));
        incidents.startProgress(incident.id(), dispatcher.getEmail());
        assertThrows(AccessDeniedException.class, () -> reports.start(id, otherTechnician.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.start(id, customer.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.resolve(id, dispatcher.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.close(id, technician.getEmail()));
        assertThrows(AccessDeniedException.class, () -> incidents.closeIncident(incident.id(), technician.getEmail()));
    }

    @Test
    void cannotAssignDisabledOrNonTechnicianAccounts() {
        Long id = report(service, customer).id();
        incident(id);
        technician.disable();
        assertThrows(IllegalArgumentException.class, () -> reports.assign(id, technician.getId(), dispatcher.getEmail()));
        assertThrows(IllegalArgumentException.class, () -> reports.assign(id, customer.getId(), dispatcher.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.assign(id, otherTechnician.getId(), customer.getEmail()));
    }

    @Test
    void cannotCloseWithoutConfirmationOrConfirmAnotherCustomersReport() {
        Long id = resolvedReport();
        assertThrows(IllegalStateException.class, () -> reports.close(id, dispatcher.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.confirmFixed(id, otherCustomer.getEmail()));
        assertThrows(AccessDeniedException.class, () -> reports.stillNotWorking(id, otherCustomer.getEmail()));
    }

    @Test
    void resolvedReportsCanBeReassignedWithoutChangingTheirResolution() {
        Long id = resolvedReport();
        ReportResponse reassigned = reports.assign(id, otherTechnician.getId(), dispatcher.getEmail());
        assertEquals(otherTechnician.getId(), reassigned.assignedTechnicianId());
        assertEquals(ReportStatus.RESOLVED, reassigned.status());
        assertNotNull(reassigned.resolvedAt());
        reports.stillNotWorking(id, customer.getEmail());
        assertEquals(ReportStatus.RESOLVED, reports.resolve(id, otherTechnician.getEmail()).status());
    }

    @Test
    void feedbackCannotChangeOpenOrClosedReports() {
        Long open = report(service, customer).id();
        assertThrows(IllegalStateException.class, () -> reports.confirmFixed(open, customer.getEmail()));
        Long closed = resolvedReport();
        reports.confirmFixed(closed, customer.getEmail());
        reports.close(closed, dispatcher.getEmail());
        assertThrows(IllegalStateException.class, () -> reports.stillNotWorking(closed, customer.getEmail()));
        assertThrows(IllegalStateException.class, () -> reports.confirmFixed(closed, customer.getEmail()));
        assertThrows(IllegalStateException.class, () -> reports.assign(closed, otherTechnician.getId(), dispatcher.getEmail()));
    }

    @Test
    void cannotCloseIncidentWithUnfinishedReportsOrAttachToClosedIncident() {
        Long id = resolvedReport();
        Long incidentId = reportRepository.findById(id).orElseThrow().getIncident().getId();
        assertThrows(IllegalStateException.class, () -> incidents.closeIncident(incidentId, dispatcher.getEmail()));
        reports.confirmFixed(id, customer.getEmail());
        reports.close(id, dispatcher.getEmail());
        incidents.closeIncident(incidentId, admin.getEmail());
        Long newReport = report(service, customer).id();
        assertThrows(IllegalStateException.class, () -> incidents.attachReports(incidentId, List.of(newReport), dispatcher.getEmail()));
        assertThrows(IllegalStateException.class, () -> reports.stillNotWorking(id, customer.getEmail()));
    }

    @Test
    void customersCannotReadInternalIncidentsOrCommentsAndTechniciansSeeOnlyTheirReports() {
        Long id = resolvedReport();
        Long incidentId = reportRepository.findById(id).orElseThrow().getIncident().getId();
        comments.addComment(incidentId, new CreateCommentRequest("Internal investigation"), technician.getEmail());
        assertEquals(1, comments.getIncidentComments(incidentId, dispatcher.getEmail(), PageRequest.of(0, 20)).getTotalElements());
        assertThrows(AccessDeniedException.class, () -> comments.getIncidentComments(incidentId, customer.getEmail(), PageRequest.of(0, 20)));
        assertThrows(AccessDeniedException.class, () -> incidents.getIncident(incidentId, customer.getEmail()));
        assertThrows(AccessDeniedException.class, () -> incidents.getIncident(incidentId, otherTechnician.getEmail()));
        assertEquals(1, reports.list(technician.getEmail(), "assigned", incidentId, null, null, PageRequest.of(0, 20)).getTotalElements());
        assertEquals(0, reports.list(otherTechnician.getEmail(), "assigned", incidentId, null, null, PageRequest.of(0, 20)).getTotalElements());
        assertThrows(AccessDeniedException.class, () -> reports.list(customer.getEmail(), "all", null, null, null, PageRequest.of(0, 20)));
    }

    @Test
    void activeReportAssignmentsProtectTechnicianAccountManagement() {
        resolvedReport();
        assertThrows(IllegalStateException.class, () -> userService.disableUser(admin.getEmail(), technician.getId()));
        assertThrows(IllegalStateException.class, () -> userService.changeUserRole(admin.getEmail(), technician.getId(), UserRole.USER));
    }

    @Test
    void anIncidentWithoutReportsCannotClose() {
        Incident empty = incidentRepository.save(new Incident("Empty test", "Details", Severity.LOW, IncidentCategory.OTHER, dispatcher));
        incidents.startProgress(empty.getId(), dispatcher.getEmail());
        assertThrows(IllegalStateException.class, () -> incidents.closeIncident(empty.getId(), dispatcher.getEmail()));
    }

    @Test
    void readOnlyHistoricalAssignmentsDoNotPreventDisablingAnAccount() {
        Incident historical = new Incident("Old outage", "Details", Severity.LOW, IncidentCategory.NETWORK, customer);
        ReflectionTestUtils.setField(historical, "legacy", true);
        ReflectionTestUtils.setField(historical, "assignedTo", technician);
        incidentRepository.saveAndFlush(historical);
        assertFalse(userService.disableUser(admin.getEmail(), technician.getId()).enabled());
        assertEquals(technician.getId(), historical.getAssignedTo().getId());
    }

    @Test
    void migrationPreservesLegacyRecordsAssignmentsCommentsAndOriginalStatus() {
        Incident historical = new Incident("Old outage", "Keep the details", Severity.HIGH, IncidentCategory.NETWORK, customer);
        ReflectionTestUtils.setField(historical, "legacy", true);
        ReflectionTestUtils.setField(historical, "assignedTo", technician);
        LocalDateTime resolved = LocalDateTime.of(2026, 10, 2, 12, 0);
        ReflectionTestUtils.setField(historical, "resolvedAt", resolved);
        incidentRepository.saveAndFlush(historical);
        Long id = historical.getId();
        comments.addComment(id, new CreateCommentRequest("Historical note"), dispatcher.getEmail());
        entityManager.flush();
        entityManager.createNativeQuery("ALTER TABLE incidents DROP CONSTRAINT incidents_status_check").executeUpdate();
        entityManager.createNativeQuery("UPDATE incidents SET status = 'RESOLVED' WHERE id = :id").setParameter("id", id).executeUpdate();
        ResourceDatabasePopulator migration =
                new ResourceDatabasePopulator(new ClassPathResource("schema.sql"));
        migration.execute(dataSource);
        migration.execute(dataSource);
        entityManager.clear();
        Incident saved = incidentRepository.findById(id).orElseThrow();
        assertTrue(saved.isLegacy());
        assertEquals("RESOLVED", saved.getLegacyStatus());
        assertEquals(IncidentStatus.IN_PROGRESS, saved.getStatus());
        assertEquals(customer.getId(), saved.getCreatedBy().getId());
        assertEquals(technician.getId(), saved.getAssignedTo().getId());
        assertEquals(resolved, saved.getResolvedAt());
        assertFalse(reportRepository.existsByIncidentId(id));
        assertEquals(1, comments.getIncidentComments(id, dispatcher.getEmail(), PageRequest.of(0, 20)).getTotalElements());
        assertThrows(IllegalStateException.class, () -> incidents.startProgress(id, dispatcher.getEmail()));
    }
}
