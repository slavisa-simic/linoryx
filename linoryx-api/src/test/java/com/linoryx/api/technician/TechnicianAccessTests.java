package com.linoryx.api.technician;

import com.linoryx.api.config.*;
import com.linoryx.api.technician.controller.*;
import com.linoryx.api.technician.service.*;
import com.linoryx.api.user.domain.UserRole;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({TechnicianProfileController.class, TechnicianOperationsController.class})
@Import({SecurityConfig.class, JwtConfig.class})
class TechnicianAccessTests {
    @Autowired MockMvc mvc;
    @MockitoBean TechnicianProfileService profiles;
    @MockitoBean TechnicianOverviewService overview;
    @MockitoBean TechnicianRecommendationService recommendations;
    @MockitoBean TechnicianAssignmentMapService assignments;

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void profileAndMapAreOnlyAccessibleToTechnicians(UserRole role) throws Exception {
        var actor = jwt().jwt(claims -> claims.subject("current@test.invalid"))
                .authorities(new SimpleGrantedAuthority("ROLE_" + role));
        int expected = role == UserRole.TECHNICIAN ? 200 : 403;
        mvc.perform(get("/api/technician-profile/me").with(actor)).andExpect(status().is(expected));
        mvc.perform(put("/api/technician-profile/me").with(actor).contentType(MediaType.APPLICATION_JSON)
                .content("{\"latitude\":null,\"longitude\":null,\"availability\":null,\"specializations\":[]}"))
                .andExpect(status().is(expected));
        mvc.perform(get("/api/technicians/me/assignment-locations").with(actor)).andExpect(status().is(expected));
        if (role != UserRole.TECHNICIAN) verifyNoInteractions(profiles, assignments);
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    void onlyOperatorsCanReadTeamProfilesAndRecommendations(UserRole role) throws Exception {
        var actor = jwt().authorities(new SimpleGrantedAuthority("ROLE_" + role));
        int expected = role == UserRole.ADMIN || role == UserRole.DISPATCHER ? 200 : 403;
        mvc.perform(get("/api/technicians/overview").with(actor)).andExpect(status().is(expected));
        mvc.perform(get("/api/reports/1/technician-recommendations").with(actor)).andExpect(status().is(expected));
        if (expected == 403) verifyNoInteractions(overview, recommendations);
    }

    @ParameterizedTest
    @ValueSource(strings = {"91,0", "-91,0", "0,181", "0,-181", "null,1", "1,null", "0.00000001,0"})
    void invalidAndPartialCoordinatesFailBeforeServiceCall(String coordinates) throws Exception {
        String[] parts = coordinates.split(",");
        mvc.perform(put("/api/technician-profile/me")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TECHNICIAN"))))
                .andExpect(status().isBadRequest());
        mvc.perform(put("/api/technician-profile/me")
                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_TECHNICIAN")))
                .contentType(MediaType.APPLICATION_JSON).content("{\"latitude\":" + parts[0] + ",\"longitude\":" + parts[1] + ",\"specializations\":[]}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(profiles);
    }

    @ParameterizedTest
    @ValueSource(strings = {"null,null", "0,0", "-90,180", "90,-180"})
    void nullZeroAndBoundaryCoordinatesAreAccepted(String coordinates) throws Exception {
        String[] parts = coordinates.split(",");
        mvc.perform(put("/api/technician-profile/me")
                .with(jwt().jwt(claims -> claims.subject("mine@test.invalid")).authorities(new SimpleGrantedAuthority("ROLE_TECHNICIAN")))
                .contentType(MediaType.APPLICATION_JSON).content("{\"latitude\":" + parts[0] + ",\"longitude\":" + parts[1] + ",\"specializations\":[]}"))
                .andExpect(status().isOk());
        verify(profiles).updateMine(eq("mine@test.invalid"), any());
    }

    @Test
    void browserCannotChooseAnotherTechnicianOrProfile() throws Exception {
        when(assignments.getMine("mine@test.invalid")).thenReturn(List.of());
        var actor = jwt().jwt(claims -> claims.subject("mine@test.invalid"))
                .authorities(new SimpleGrantedAuthority("ROLE_TECHNICIAN"));
        mvc.perform(get("/api/technicians/me/assignment-locations?technicianId=999").with(actor))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        verify(assignments).getMine("mine@test.invalid");
        mvc.perform(put("/api/technician-profile/999").with(actor).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(profiles);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/technician-profile/me", "/api/technicians/overview", "/api/technicians/me/assignment-locations", "/api/reports/1/technician-recommendations"})
    void allNewEndpointsRequireAuthentication(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
        verifyNoInteractions(profiles, overview, recommendations, assignments);
    }
}
