package com.linoryx.api.report;

import com.linoryx.api.customerservice.domain.CustomerService;
import com.linoryx.api.customerservice.domain.ServiceLocation;
import com.linoryx.api.customerservice.domain.ServiceStatus;
import com.linoryx.api.customerservice.domain.ServiceType;
import com.linoryx.api.customerservice.repository.CustomerServiceRepository;
import com.linoryx.api.customerservice.repository.ServiceLocationRepository;
import com.linoryx.api.incident.domain.IncidentCategory;
import com.linoryx.api.incident.domain.IncidentStatus;
import com.linoryx.api.incident.domain.Severity;
import com.linoryx.api.incident.dto.CreateIncidentRequest;
import com.linoryx.api.incident.services.IncidentService;
import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.network.domain.NetworkNode;
import com.linoryx.api.network.domain.NodeStatus;
import com.linoryx.api.network.domain.NodeType;
import com.linoryx.api.network.repository.NetworkNodeRepository;
import com.linoryx.api.report.domain.ReportCategory;
import com.linoryx.api.report.domain.ReportStatus;
import com.linoryx.api.report.dto.CreateReportRequest;
import com.linoryx.api.report.service.CustomerReportService;
import com.linoryx.api.technician.domain.TechnicianAvailability;
import com.linoryx.api.technician.domain.TechnicianProfile;
import com.linoryx.api.technician.repository.TechnicianProfileRepository;
import com.linoryx.api.user.domain.User;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.repository.UserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {"spring.mail.test-connection=false", "notification.email-enabled=false"})
@Transactional
class ReportWorkflowIntegrationTest {
    @Autowired UserRepository users;
    @Autowired TechnicianProfileRepository profiles;
    @Autowired CustomerServiceRepository services;
    @Autowired ServiceLocationRepository locations;
    @Autowired NetworkNodeRepository nodes;
    @Autowired CustomerReportService reports;
    @Autowired IncidentService incidents;

    private User customer;
    private CustomerService service;

    @BeforeEach
    void setUp() {
        customer = createUser(UserRole.USER);
        LocationData address = new LocationData("Demo Street 12", "Novi Sad", "RS",
                new BigDecimal("45.25"), new BigDecimal("19.84"));
        ServiceLocation location = locations.save(new ServiceLocation(address));
        NetworkNode node = nodes.save(new NetworkNode("TEST-" + UUID.randomUUID(), "Test OLT",
                NodeType.GPON_OLT, address, NodeStatus.ACTIVE));
        service = services.save(new CustomerService(customer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE));
    }

    @Test
    void customerAndStaffCanCloseAReportAndItsIncident() {
        User dispatcher = createUser(UserRole.DISPATCHER);
        User technician = createUser(UserRole.TECHNICIAN);
        TechnicianProfile profile = new TechnicianProfile(technician);
        profile.update(null, null, TechnicianAvailability.AVAILABLE, Set.of());
        profiles.save(profile);

        var report = reports.create(reportRequest(), customer.getEmail());
        assertEquals(ReportStatus.OPEN, report.status());

        var incident = incidents.createIncident(new CreateIncidentRequest("Fiber outage", "Repair the connection",
                Severity.HIGH, IncidentCategory.FIBER_FAILURE, List.of(report.id())), dispatcher.getEmail());
        reports.assign(report.id(), technician.getId(), dispatcher.getEmail());
        incidents.startProgress(incident.id(), dispatcher.getEmail());
        assertEquals(ReportStatus.IN_PROGRESS, reports.start(report.id(), technician.getEmail()).status());
        assertEquals(ReportStatus.RESOLVED, reports.resolve(report.id(), technician.getEmail()).status());
        assertTrue(reports.confirmFixed(report.id(), customer.getEmail()).userConfirmed());
        assertEquals(ReportStatus.CLOSED, reports.close(report.id(), dispatcher.getEmail()).status());
        assertEquals(IncidentStatus.CLOSED, incidents.closeIncident(incident.id(), dispatcher.getEmail()).status());
    }

    @Test
    void customerCannotReportAnotherCustomersService() {
        User otherCustomer = createUser(UserRole.USER);
        assertThrows(AccessDeniedException.class, () -> reports.create(reportRequest(), otherCustomer.getEmail()));
    }

    private CreateReportRequest reportRequest() {
        return new CreateReportRequest(service.getId(), ReportCategory.NO_INTERNET, "No connection");
    }

    private User createUser(UserRole role) {
        return users.save(new User(UUID.randomUUID() + "@test.invalid", "hash", "Test", role.name(), role));
    }
}
