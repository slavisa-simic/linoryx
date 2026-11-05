package com.vigil.api.technician;

import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.customerservice.domain.*;
import com.vigil.api.customerservice.repository.*;
import com.vigil.api.incident.domain.*;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.services.IncidentService;
import com.vigil.api.location.domain.LocationData;
import com.vigil.api.network.domain.*;
import com.vigil.api.network.repository.NetworkNodeRepository;
import com.vigil.api.network.service.NetworkNodeService;
import com.vigil.api.customerservice.service.CustomerServiceService;
import com.vigil.api.notification.EmailService;
import com.vigil.api.report.domain.*;
import com.vigil.api.report.dto.CreateReportRequest;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.report.service.CustomerReportService;
import com.vigil.api.technician.domain.*;
import com.vigil.api.technician.dto.*;
import com.vigil.api.technician.repository.TechnicianProfileRepository;
import com.vigil.api.technician.service.*;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
class TechnicianOperationsIntegrationTest {
    @Autowired UserRepository accounts;
    @Autowired UserService users;
    @Autowired TechnicianProfileRepository profiles;
    @Autowired TechnicianProfileService profileService;
    @Autowired TechnicianOverviewService overview;
    @Autowired TechnicianRecommendationService recommendations;
    @Autowired TechnicianAssignmentMapService map;
    @Autowired CustomerReportRepository reportRepository;
    @Autowired CustomerReportService reports;
    @Autowired CustomerServiceRepository services;
    @Autowired CustomerServiceService serviceManagement;
    @Autowired ServiceLocationRepository locations;
    @Autowired NetworkNodeRepository nodes;
    @Autowired NetworkNodeService networkManagement;
    @Autowired IncidentService incidents;
    @Autowired AuditLogRepository audit;
    @Autowired EntityManager entityManager;
    @Autowired javax.sql.DataSource dataSource;
    @MockitoBean EmailService email;
    User admin;
    User dispatcher;
    User customer;
    User technician;
    User other;
    CustomerService service;

    @BeforeEach
    void setup() {
        admin = account(UserRole.ADMIN);
        dispatcher = account(UserRole.DISPATCHER);
        customer = account(UserRole.USER);
        technician = account(UserRole.USER);
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.TECHNICIAN);
        other = account(UserRole.USER);
        users.changeUserRole(admin.getEmail(), other.getId(), UserRole.TECHNICIAN);
        LocationData address = new LocationData("Installation Street 42", "Novi Sad", "RS", new BigDecimal("45.25"), new BigDecimal("19.84"));
        LocationData infrastructure = new LocationData("Unrelated infrastructure address", "Novi Sad", "RS", BigDecimal.ONE, BigDecimal.TEN);
        ServiceLocation location = locations.save(new ServiceLocation(address));
        NetworkNode node = nodes.save(new NetworkNode("V2-" + UUID.randomUUID(), "OLT", NodeType.GPON_OLT, infrastructure, NodeStatus.ACTIVE));
        service = services.save(new CustomerService(customer, ServiceType.FIBER, location, node, ServiceStatus.ACTIVE));
    }

    private User account(UserRole role) {
        return accounts.save(new User(UUID.randomUUID() + "@v2.invalid", "hash", "Test", role.name(), role));
    }

    private TechnicianProfile profile(User technician) {
        return profiles.findByUserId(technician.getId()).orElseThrow();
    }

    private void configure(User technician) {
        profileService.updateMine(technician.getEmail(), new UpdateTechnicianProfileRequest(new BigDecimal("45.2"),
                new BigDecimal("19.8"), TechnicianAvailability.AVAILABLE, Set.of(TechnicianSpecialization.FIBER, TechnicianSpecialization.GPON)));
    }

    private Long report() {
        return reports.create(new CreateReportRequest(service.getId(), ReportCategory.NO_INTERNET, "No connection"), customer.getEmail()).id();
    }

    private Long link(Long... ids) {
        return incidents.createIncident(new CreateIncidentRequest("Fiber outage", "Investigate", Severity.LOW,
                IncidentCategory.NETWORK, List.of(ids)), dispatcher.getEmail()).id();
    }

    @Test
    void roleGrantCreatesEmptyProfileAndRepeatedGrantDoesNotDuplicateIt() {
        TechnicianProfileResponse response = profileService.getMine(technician.getEmail());
        assertNull(response.latitude());
        assertNull(response.longitude());
        assertNull(response.availability());
        assertNull(response.locationUpdatedAt());
        assertTrue(response.specializations().isEmpty());
        Long profileId = profile(technician).getId();
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.TECHNICIAN);
        assertEquals(profileId, profile(technician).getId());
    }

    @Test
    void deletingAndRegrantingRolePermanentlyClearsOperationalInformation() {
        configure(technician);
        Long oldId = profile(technician).getId();
        entityManager.flush();
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.DISPATCHER);
        assertTrue(profiles.findByUserId(technician.getId()).isEmpty());
        Number skills = (Number) entityManager.createNativeQuery("select count(*) from technician_specializations where profile_id = :id")
                .setParameter("id", oldId).getSingleResult();
        assertEquals(0, skills.longValue());
        assertTrue(accounts.existsById(technician.getId()));
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.TECHNICIAN);
        assertNotEquals(oldId, profile(technician).getId());
        assertNull(profile(technician).getAvailability());
        assertTrue(profile(technician).getSpecializations().isEmpty());
    }

    @Test
    void migrationBackfillsMissingProfilesWithoutOverwritingExistingOnes() {
        User existing = account(UserRole.TECHNICIAN);
        configure(technician);
        entityManager.flush();
        ResourceDatabasePopulator migration = new ResourceDatabasePopulator(new ClassPathResource("schema.sql"));
        migration.execute(dataSource);
        migration.execute(dataSource);
        entityManager.clear();
        assertNull(profile(existing).getLatitude());
        assertNull(profile(existing).getAvailability());
        assertTrue(profile(existing).getSpecializations().isEmpty());
        assertEquals(TechnicianAvailability.AVAILABLE, profile(technician).getAvailability());
        assertEquals(2, profile(technician).getSpecializations().size());
    }

    @Test
    void zeroCoordinatesPersistAndTimestampOnlyChangesWithLocation() {
        UpdateTechnicianProfileRequest zero = new UpdateTechnicianProfileRequest(BigDecimal.ZERO, BigDecimal.ZERO,
                TechnicianAvailability.AVAILABLE, Set.of(TechnicianSpecialization.DSL));
        var saved = profileService.updateMine(technician.getEmail(), zero);
        assertNotNull(saved.locationUpdatedAt());
        var same = profileService.updateMine(technician.getEmail(), new UpdateTechnicianProfileRequest(new BigDecimal("0.000"),
                BigDecimal.ZERO, TechnicianAvailability.BUSY, Set.of()));
        assertEquals(saved.locationUpdatedAt(), same.locationUpdatedAt());
        configure(technician);
        assertNotEquals(saved.locationUpdatedAt(), profile(technician).getLocationUpdatedAt());
        entityManager.flush();
        entityManager.clear();
        assertEquals(2, profile(technician).getSpecializations().size());
        var cleared = profileService.updateMine(technician.getEmail(), new UpdateTechnicianProfileRequest(null, null, null, Set.of()));
        assertNull(cleared.latitude());
        assertNull(cleared.longitude());
        assertNull(cleared.locationUpdatedAt());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "ADMIN", "DISPATCHER"})
    void nonTechniciansCannotReadOrUpdateProfilesOrUseAssignmentMap(UserRole role) {
        User actor = account(role);
        assertThrows(AccessDeniedException.class, () -> profileService.getMine(actor.getEmail()));
        assertThrows(AccessDeniedException.class, () -> profileService.updateMine(actor.getEmail(),
                new UpdateTechnicianProfileRequest(null, null, null, Set.of())));
        assertThrows(AccessDeniedException.class, () -> map.getMine(actor.getEmail()));
    }

    @Test
    void updatingMyProfileDoesNotChangeAnotherTechnician() {
        configure(technician);
        assertNull(profile(other).getLatitude());
        assertNull(profile(other).getAvailability());
        assertTrue(profile(other).getSpecializations().isEmpty());
        assertThrows(AccessDeniedException.class, () -> overview.list(technician.getEmail()));
        assertThrows(AccessDeniedException.class, () -> recommendations.recommend(report(), technician.getEmail()));
        assertThrows(AccessDeniedException.class, () -> networkManagement.list(technician.getEmail(), PageRequest.of(0, 20)));
        assertThrows(AccessDeniedException.class, () -> serviceManagement.list(technician.getEmail(), customer.getId(), PageRequest.of(0, 20)));
    }

    @ParameterizedTest
    @EnumSource(value = ReportStatus.class, names = {"OPEN", "IN_PROGRESS", "RESOLVED"})
    void everyActiveReportStatusBlocksRoleRemovalAndCountsTowardWorkload(ReportStatus status) {
        configure(technician);
        Long id = report();
        link(id);
        reports.assign(id, technician.getId(), dispatcher.getEmail());
        ReflectionTestUtils.setField(reportRepository.findById(id).orElseThrow(), "status", status);
        assertEquals(1, overview.list(dispatcher.getEmail()).stream().filter(item -> item.userId().equals(technician.getId())).findFirst().orElseThrow().activeReportCount());
        assertEquals(1, map.getMine(technician.getEmail()).size());
        assertEquals(1, profileService.getMine(technician.getEmail()).activeReportCount());
        assertThrows(IllegalStateException.class, () -> users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.USER));
        assertTrue(profiles.findByUserId(technician.getId()).isPresent());
    }

    @Test
    void mapGroupsOwnActiveInstallationLocationsAndReflectsReassignmentAndClosure() {
        configure(technician);
        configure(other);
        Long first = report();
        Long second = report();
        Long third = report();
        Long unassigned = report();
        Long incident = link(first, second, third, unassigned);
        reports.assign(first, technician.getId(), dispatcher.getEmail());
        reports.assign(second, technician.getId(), dispatcher.getEmail());
        reports.assign(third, other.getId(), dispatcher.getEmail());
        var locations = map.getMine(technician.getEmail());
        assertEquals(1, locations.size());
        assertEquals(0, service.getServiceLocation().getLatitude().compareTo(locations.getFirst().latitude()));
        assertEquals("Installation Street 42", locations.getFirst().address());
        assertEquals(List.of(first, second), locations.getFirst().reports().stream().map(AssignmentLocationResponse.AssignedReport::id).toList());
        reports.assign(second, other.getId(), dispatcher.getEmail());
        assertEquals(List.of(first), map.getMine(technician.getEmail()).getFirst().reports().stream().map(AssignmentLocationResponse.AssignedReport::id).toList());
        incidents.startProgress(incident, dispatcher.getEmail());
        reports.start(first, technician.getEmail());
        reports.resolve(first, technician.getEmail());
        assertEquals(1, map.getMine(technician.getEmail()).size());
        reports.confirmFixed(first, customer.getEmail());
        reports.close(first, dispatcher.getEmail());
        assertTrue(map.getMine(technician.getEmail()).isEmpty());
        assertEquals(1, map.getMine(other.getEmail()).size());
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.USER);
        assertEquals(technician.getId(), reportRepository.findById(first).orElseThrow().getAssignedTechnician().getId());
        assertTrue(audit.findAll().stream().anyMatch(entry -> entry.getReport() != null && entry.getReport().getId().equals(second)
                && entry.getAction() == AuditAction.REPORT_ASSIGNED && entry.getTargetUser().getId().equals(other.getId())));
    }

    @Test
    void manualOverrideAcceptsAvailableIncompleteSkillsAndLocationButRejectsOtherAvailability() {
        Long id = report();
        link(id);
        assertThrows(IllegalStateException.class, () -> reports.assign(id, technician.getId(), dispatcher.getEmail()));
        for (TechnicianAvailability availability : TechnicianAvailability.values()) {
            profileService.updateMine(technician.getEmail(), new UpdateTechnicianProfileRequest(null, null, availability, Set.of()));
            if (availability == TechnicianAvailability.AVAILABLE) {
                assertEquals(technician.getId(), reports.assign(id, technician.getId(), dispatcher.getEmail()).assignedTechnicianId());
            } else {
                assertThrows(IllegalStateException.class, () -> reports.assign(id, technician.getId(), dispatcher.getEmail()));
            }
        }
    }

    @Test
    void recommendationsExcludeDisabledAndNonTechniciansAndExplainIncompleteProfiles() {
        Long id = report();
        configure(technician);
        other.disable();
        User missing = account(UserRole.TECHNICIAN);
        var candidates = recommendations.recommend(id, dispatcher.getEmail());
        assertTrue(candidates.stream().anyMatch(item -> item.technician().userId().equals(technician.getId()) && item.recommended() && item.distanceKm() > 0));
        assertFalse(candidates.stream().anyMatch(item -> item.technician().userId().equals(other.getId()) || item.technician().userId().equals(customer.getId())));
        var incomplete = candidates.stream().filter(item -> item.technician().userId().equals(missing.getId())).findFirst().orElseThrow();
        assertFalse(incomplete.recommended());
        assertFalse(incomplete.assignable());
        assertNull(incomplete.distanceKm());
        assertEquals(3, incomplete.warnings().size());
    }

    @Test
    void fullAcceptanceWorkflowPreservesHistoryAndCreatesFreshProfileAfterRegrant() {
        configure(technician);
        Long id = report();
        Long incidentId = link(id);
        assertTrue(recommendations.recommend(id, dispatcher.getEmail()).stream().anyMatch(item -> item.technician().userId().equals(technician.getId()) && item.recommended()));
        reports.assign(id, technician.getId(), dispatcher.getEmail());
        assertEquals(id, map.getMine(technician.getEmail()).getFirst().reports().getFirst().id());
        incidents.startProgress(incidentId, dispatcher.getEmail());
        reports.start(id, technician.getEmail());
        reports.resolve(id, technician.getEmail());
        reports.confirmFixed(id, customer.getEmail());
        reports.close(id, dispatcher.getEmail());
        incidents.closeIncident(incidentId, dispatcher.getEmail());
        assertTrue(map.getMine(technician.getEmail()).isEmpty());
        Long oldId = profile(technician).getId();
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.USER);
        assertTrue(profiles.findByUserId(technician.getId()).isEmpty());
        entityManager.flush();
        entityManager.clear();
        assertEquals(technician.getId(), reportRepository.findById(id).orElseThrow().getAssignedTechnician().getId());
        assertEquals(IncidentStatus.CLOSED, incidents.getIncident(incidentId, dispatcher.getEmail()).status());
        users.changeUserRole(admin.getEmail(), technician.getId(), UserRole.TECHNICIAN);
        assertNotEquals(oldId, profile(technician).getId());
        assertNull(profile(technician).getLatitude());
        assertNull(profile(technician).getAvailability());
        assertTrue(profile(technician).getSpecializations().isEmpty());
    }
}
