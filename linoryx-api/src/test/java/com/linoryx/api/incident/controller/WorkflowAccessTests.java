package com.linoryx.api.incident.controller;

import com.linoryx.api.comment.controller.CommentController;
import com.linoryx.api.comment.service.CommentService;
import com.linoryx.api.config.JwtConfig;
import com.linoryx.api.config.SecurityConfig;
import com.linoryx.api.incident.services.IncidentService;
import com.linoryx.api.incident.domain.IncidentCategory;
import com.linoryx.api.user.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.Mockito.verify;

@WebMvcTest(controllers = {IncidentController.class, CommentController.class}, properties =
        "security.jwt.secret=test-secret-for-workflow-at-least-32-bytes")
@Import({SecurityConfig.class, JwtConfig.class})
class WorkflowAccessTests {
    @Autowired private MockMvc mvc;
    @MockitoBean private IncidentService incidentService;
    @MockitoBean private CommentService commentService;

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void allRolesCanListTheirVisibleIncidents(UserRole role) throws Exception {
        mvc.perform(get("/api/incidents").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().is(role == UserRole.USER ? 403 : 200));
        mvc.perform(get("/api/incidents/10").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().is(role == UserRole.USER ? 403 : 200));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void onlyOperatorsCanCreateFromReports(UserRole role) throws Exception {
        mvc.perform(post("/api/incidents/from-reports").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Network problem","description":"Connection lost","severity":"HIGH","category":"FIBER_FAILURE","reportIds":[1]}
                                """))
                .andExpect(status().is((role == UserRole.USER || role == UserRole.TECHNICIAN) ? 403 : 201));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void onlyOperatorsCanChangeTheCause(UserRole role) throws Exception {
        mvc.perform(patch("/api/incidents/10/category")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name())))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"category\":\"FIBER_FAILURE\"}"))
                .andExpect(status().is(role == UserRole.USER || role == UserRole.TECHNICIAN ? 403 : 200));
    }

    @ParameterizedTest
    @EnumSource(IncidentCategory.class)
    void categoryEndpointAcceptsEveryTelecomCause(IncidentCategory category) throws Exception {
        mvc.perform(patch("/api/incidents/10/category")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DISPATCHER")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"category\":\"" + category.name() + "\"}"))
                .andExpect(status().isOk());
        verify(incidentService).changeCategory(10L, category, "user");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"category\":null}", "{\"category\":\"CLOUD\"}", "{\"category\":\"NO_INTERNET\"}"})
    void categoryUpdateRequiresAValidIncidentCause(String body) throws Exception {
        mvc.perform(patch("/api/incidents/10/category")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DISPATCHER")))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void creatingAnIncidentCanOmitTheCause() throws Exception {
        mvc.perform(post("/api/incidents/from-reports")
                        .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_DISPATCHER")))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"title":"Outage","description":"Investigating","severity":"HIGH","reportIds":[1]}
                                """))
                .andExpect(status().isCreated());
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void onlyOperatorsCanProgressIncidents(UserRole role) throws Exception {
        for (String action : new String[]{"start", "close"}) {
            mvc.perform(patch("/api/incidents/10/" + action).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                    .andExpect(status().is(role == UserRole.USER || role == UserRole.TECHNICIAN ? 403 : 200));
        }
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void writingCommentsIsAvailableToTechniciansAdministratorsAndDispatchers(UserRole role) throws Exception {
        mvc.perform(post("/api/incidents/10/comments").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name())))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Checked the network logs\"}"))
                .andExpect(status().is(role == UserRole.USER ? 403 : 200));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void customersCannotReadInternalComments(UserRole role) throws Exception {
        mvc.perform(get("/api/incidents/10/comments").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().is(role == UserRole.USER ? 403 : 200));
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/incidents/10")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/incidents/10/comments")).andExpect(status().isUnauthorized());
        mvc.perform(patch("/api/incidents/10/category").contentType(MediaType.APPLICATION_JSON)
                .content("{\"category\":\"FIBER_FAILURE\"}")).andExpect(status().isUnauthorized());
    }
}
