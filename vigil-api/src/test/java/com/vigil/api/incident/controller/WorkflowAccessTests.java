package com.vigil.api.incident.controller;

import com.vigil.api.comment.controller.CommentController;
import com.vigil.api.comment.service.CommentService;
import com.vigil.api.config.JwtConfig;
import com.vigil.api.config.SecurityConfig;
import com.vigil.api.incident.services.IncidentService;
import com.vigil.api.user.domain.UserRole;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void creatingIsAvailableToUsersAndAdministrators(UserRole role) throws Exception {
        mvc.perform(post("/api/incidents").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Network problem","description":"Connection lost","severity":"HIGH","category":"NETWORK"}
                                """))
                .andExpect(status().is(role == UserRole.TECHNICIAN ? 403 : 201));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void assignmentIsAvailableOnlyToAdministrator(UserRole role) throws Exception {
        mvc.perform(patch("/api/incidents/10/assign").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name())))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"technicianId\":8}"))
                .andExpect(status().is(role == UserRole.ADMIN ? 200 : 403));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void progressingIsAvailableToTechniciansAndAdministrators(UserRole role) throws Exception {
        for (String action : new String[]{"start", "resolve", "close"}) {
            mvc.perform(patch("/api/incidents/10/" + action).with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                    .andExpect(status().is(role == UserRole.USER ? 403 : 200));
        }
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void writingCommentsIsAvailableToTechniciansAndAdministrators(UserRole role) throws Exception {
        mvc.perform(post("/api/incidents/10/comments").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name())))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Checked the network logs\"}"))
                .andExpect(status().is(role == UserRole.USER ? 403 : 200));
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void allRolesCanReadCommentsForTheirIncidents(UserRole role) throws Exception {
        mvc.perform(get("/api/incidents/10/comments").with(jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role.name()))))
                .andExpect(status().isOk());
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/incidents/10")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/incidents/10/comments")).andExpect(status().isUnauthorized());
    }
}
