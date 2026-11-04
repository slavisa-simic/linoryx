package com.vigil.api.customerservice;

import com.vigil.api.config.*;
import com.vigil.api.customerservice.controller.CustomerServiceController;
import com.vigil.api.customerservice.service.CustomerServiceService;
import com.vigil.api.location.controller.LocationController;
import com.vigil.api.location.service.LocationService;
import com.vigil.api.network.controller.NetworkNodeController;
import com.vigil.api.network.service.NetworkNodeService;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({NetworkNodeController.class, CustomerServiceController.class, LocationController.class})
@Import({SecurityConfig.class, JwtConfig.class})
class ProvisioningAccessTests {
    @Autowired MockMvc mvc;
    @MockitoBean NetworkNodeService nodes;
    @MockitoBean CustomerServiceService services;
    @MockitoBean LocationService locations;
    @MockitoBean UserService users;
    private final String nodeBody = """
            {"name":"Node", "nodeType":"ROUTER", "status":"ACTIVE", "location":{
              "placeId":"place", "latitude":44.8,"longitude":20.4,"positionConfirmed":true}}
            """;
    private final String serviceBody = """
            {"serviceType":"FIBER", "networkNodeId":1, "status":"ACTIVE", "location":{
              "placeId":"place", "latitude":44.8,"longitude":20.4,"positionConfirmed":true}}
            """;

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN", "DISPATCHER"})
    void nonAdministratorsCannotModifyOrListInfrastructure(UserRole role) throws Exception {
        var actor = jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()));
        mvc.perform(get("/api/network-nodes").with(actor)).andExpect(status().isForbidden());
        mvc.perform(post("/api/network-nodes").with(actor).contentType(MediaType.APPLICATION_JSON).content(nodeBody))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/network-nodes/1").with(actor).contentType(MediaType.APPLICATION_JSON).content(nodeBody))
                .andExpect(status().isForbidden());
        mvc.perform(delete("/api/network-nodes/1").with(actor)).andExpect(status().isForbidden());
        mvc.perform(get("/api/locations/search?query=Belgrade").with(actor)).andExpect(status().isForbidden());
        verifyNoInteractions(nodes, locations, users);
    }

    @ParameterizedTest
    @EnumSource(value = UserRole.class, names = {"USER", "TECHNICIAN", "DISPATCHER"})
    void nonAdministratorsCannotAssignUpdateOrTerminateServices(UserRole role) throws Exception {
        var actor = jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()));
        mvc.perform(post("/api/users/2/services").with(actor).contentType(MediaType.APPLICATION_JSON).content(serviceBody))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/customer-services/1").with(actor).contentType(MediaType.APPLICATION_JSON).content(serviceBody))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/customer-services/1/terminate").with(actor)).andExpect(status().isForbidden());
        verifyNoInteractions(services);
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void onlyAdministratorsAndCustomersMayRequestServices(UserRole role) throws Exception {
        when(services.list(anyString(), any(), any())).thenReturn(Page.empty());
        int expected = role == UserRole.ADMIN || role == UserRole.USER ? 200 : 403;
        mvc.perform(get("/api/customer-services")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().is(expected));
    }

    @Test
    void administratorCanCreateAndDeleteNodesAndAssignServices() throws Exception {
        var actor = jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
        mvc.perform(post("/api/network-nodes").with(actor).contentType(MediaType.APPLICATION_JSON).content(nodeBody))
                .andExpect(status().isCreated());
        mvc.perform(delete("/api/network-nodes/1").with(actor)).andExpect(status().isNoContent());
        mvc.perform(post("/api/users/2/services").with(actor).contentType(MediaType.APPLICATION_JSON).content(serviceBody))
                .andExpect(status().isCreated());
        verify(nodes).create(anyString(), any());
        verify(nodes).delete(anyString(), eq(1L));
        verify(services).create(anyString(), eq(2L), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"91", "-91", "null"})
    void invalidCoordinatesAreRejectedBeforeNodeCreation(String latitude) throws Exception {
        mvc.perform(post("/api/network-nodes")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .contentType(MediaType.APPLICATION_JSON).content(nodeBody.replace("44.8", latitude)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(nodes);
    }

    @Test
    void missingServiceLocationAndInvalidEnumsAreRejected() throws Exception {
        var actor = jwt().authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
        mvc.perform(post("/api/users/2/services").with(actor).contentType(MediaType.APPLICATION_JSON)
                .content("{\"serviceType\":\"FIBER\",\"networkNodeId\":1}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/network-nodes").with(actor).contentType(MediaType.APPLICATION_JSON)
                .content(nodeBody.replace("ROUTER", "INVALID")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(nodes, services);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/network-nodes", "/api/customer-services", "/api/locations/search?query=Belgrade"})
    void allNewEndpointsRequireAuthentication(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }
}
