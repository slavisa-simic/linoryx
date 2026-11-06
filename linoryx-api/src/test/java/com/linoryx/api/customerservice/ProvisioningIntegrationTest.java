package com.linoryx.api.customerservice;

import com.linoryx.api.customerservice.domain.*;
import com.linoryx.api.customerservice.dto.*;
import com.linoryx.api.customerservice.repository.CustomerServiceRepository;
import com.linoryx.api.customerservice.service.CustomerServiceService;
import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.location.dto.LocationRequest;
import com.linoryx.api.location.provider.*;
import com.linoryx.api.network.domain.*;
import com.linoryx.api.network.dto.*;
import com.linoryx.api.network.service.NetworkNodeService;
import com.linoryx.api.user.domain.*;
import com.linoryx.api.user.repository.UserRepository;
import com.linoryx.api.user.service.UserService;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@Transactional
class ProvisioningIntegrationTest {
    @Autowired NetworkNodeService nodes;
    @Autowired CustomerServiceService services;
    @Autowired UserRepository users;
    @Autowired UserService userService;
    @Autowired CustomerServiceRepository serviceRepository;
    @Autowired EntityManager entityManager;
    @MockitoBean GeocodingProvider provider;
    private User admin;
    private User customer;
    private String city;
    private final LocationRequest location = new LocationRequest("place", new BigDecimal("45.25"), new BigDecimal("19.84"), true);

    @BeforeEach
    void setup() {
        String prefix = UUID.randomUUID().toString();
        city = "Novi Sad " + prefix;
        admin = users.save(new User(prefix + "-admin@test.invalid", "hash", "Test", "Admin", UserRole.ADMIN));
        customer = users.save(new User(prefix + "-customer@test.invalid", "hash", "Test", "Customer", UserRole.USER));
    }

    private NetworkNodeResponse createNode() {
        when(provider.getPlace("place")).thenReturn(new GeocodingResult(
                new LocationData("Main Street 42, " + city, city, "RS", location.latitude(), location.longitude()),
                "place", "building", "Main Street", "42"));
        return nodes.create(admin.getEmail(), new CreateNetworkNodeRequest("Test OLT", NodeType.GPON_OLT, location, null));
    }

    private CustomerServiceResponse assign(Long nodeId) {
        return services.create(admin.getEmail(), customer.getId(),
                new CreateCustomerServiceRequest(ServiceType.FIBER, location, nodeId, null));
    }

    @Test
    void aCustomerCanHaveMultipleServicesAndDisablingTheAccountDoesNotChangeThem() {
        NetworkNodeResponse node = createNode();
        CustomerServiceResponse first = assign(node.id());
        CustomerServiceResponse second = assign(node.id());
        entityManager.flush();
        assertEquals(NodeStatus.ACTIVE, node.status());
        assertEquals(ServiceStatus.ACTIVE, first.status());
        assertNotEquals(first.id(), second.id());
        assertEquals(2, services.list(customer.getEmail(), null, PageRequest.of(0, 20)).getTotalElements());
        assertEquals(2, serviceRepository.countByNetworkNodeId(node.id()));
        userService.disableUser(admin.getEmail(), customer.getId());
        assertEquals(ServiceStatus.ACTIVE, serviceRepository.findById(first.id()).orElseThrow().getStatus());
    }

    @Test
    void terminatedServicesStillProtectTheirNodeAndKeepTheirLocation() {
        NetworkNodeResponse node = createNode();
        CustomerServiceResponse item = assign(node.id());
        assertEquals(ServiceStatus.TERMINATED, services.terminate(admin.getEmail(), item.id()).status());
        assertThrows(IllegalStateException.class, () -> nodes.delete(admin.getEmail(), node.id()));
        assertNotNull(serviceRepository.findById(item.id()).orElseThrow().getServiceLocation().getId());
    }

    @Test
    void roleChangesWaitUntilLiveServicesAreTerminated() {
        CustomerServiceResponse item = assign(createNode().id());
        assertThrows(IllegalStateException.class,
                () -> userService.changeUserRole(admin.getEmail(), customer.getId(), UserRole.TECHNICIAN));
        services.terminate(admin.getEmail(), item.id());
        assertEquals(UserRole.TECHNICIAN,
                userService.changeUserRole(admin.getEmail(), customer.getId(), UserRole.TECHNICIAN).role());
    }

    @Test
    void ownServiceListingDoesNotAllowAnotherCustomersId() {
        assign(createNode().id());
        assertThrows(AccessDeniedException.class,
                () -> services.list(customer.getEmail(), admin.getId(), PageRequest.of(0, 20)));
        var ownServices = services.list(customer.getEmail(), null, PageRequest.of(0, 20));
        assertEquals(1, ownServices.getTotalElements());
        assertNull(ownServices.getContent().getFirst().networkNodeId());
        assertNull(ownServices.getContent().getFirst().networkNodeCode());
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"ADMIN", "TECHNICIAN", "DISPATCHER"})
    void servicesCanOnlyBeAssignedToUserAccounts(UserRole role) {
        NetworkNodeResponse node = createNode();
        customer.changeRole(role);
        assertThrows(IllegalArgumentException.class, () -> assign(node.id()));
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN", "DISPATCHER"})
    void otherRolesCannotManageInfrastructureOrCustomerServices(UserRole role) {
        customer.changeRole(role);
        assertThrows(AccessDeniedException.class, () -> nodes.create(customer.getEmail(),
                new CreateNetworkNodeRequest("Denied", NodeType.ROUTER, location, null)));
        assertThrows(AccessDeniedException.class, () -> services.create(customer.getEmail(), customer.getId(),
                new CreateCustomerServiceRequest(ServiceType.DSL, location, 999L, null)));
        verifyNoInteractions(provider);
    }

    @Test
    void editingPreservesTheCodeAndRejectsAnotherCity() {
        NetworkNodeResponse node = createNode();
        NetworkNodeResponse updated = nodes.update(admin.getEmail(), node.id(),
                new UpdateNetworkNodeRequest("New name", NodeType.ROUTER, null, NodeStatus.MAINTENANCE));
        assertEquals(node.code(), updated.code());
        assertEquals(NodeStatus.MAINTENANCE, updated.status());
        when(provider.getPlace("other")).thenReturn(new GeocodingResult(
                new LocationData("Other city", "Belgrade", "RS", location.latitude(), location.longitude()),
                "other", "city", "", ""));
        assertThrows(IllegalArgumentException.class, () -> nodes.update(admin.getEmail(), node.id(),
                new UpdateNetworkNodeRequest("New name", NodeType.ROUTER,
                        new LocationRequest("other", location.latitude(), location.longitude(), true), NodeStatus.ACTIVE)));
        entityManager.flush();
    }

    @Test
    void deletingANodeDoesNotReuseItsCode() {
        NetworkNodeResponse first = createNode();
        nodes.delete(admin.getEmail(), first.id());
        NetworkNodeResponse next = createNode();
        assertTrue(first.code().endsWith("-001"));
        assertTrue(next.code().endsWith("-002"));
    }

    @Test
    void serviceUpdatesKeepTheOriginalCustomerAndCanKeepTheSavedLocation() {
        NetworkNodeResponse node = createNode();
        CustomerServiceResponse item = assign(node.id());
        CustomerServiceResponse updated = services.update(admin.getEmail(), item.id(),
                new UpdateCustomerServiceRequest(ServiceType.WIRELESS, null, node.id(), ServiceStatus.SUSPENDED));
        entityManager.flush();
        assertEquals(item.customerId(), updated.customerId());
        assertEquals(item.serviceLocationId(), updated.serviceLocationId());
        assertEquals(ServiceType.WIRELESS, updated.serviceType());
        assertEquals(ServiceStatus.SUSPENDED, updated.status());
    }
}
