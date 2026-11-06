package com.linoryx.api.technician.controller;

import com.linoryx.api.technician.dto.*;
import com.linoryx.api.technician.service.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@SecurityRequirement(name = "bearerAuth")
public class TechnicianOperationsController {
    private final TechnicianOverviewService overview;
    private final TechnicianRecommendationService recommendations;
    private final TechnicianAssignmentMapService assignments;

    public TechnicianOperationsController(TechnicianOverviewService overview, TechnicianRecommendationService recommendations,
                                          TechnicianAssignmentMapService assignments) {
        this.overview = overview;
        this.recommendations = recommendations;
        this.assignments = assignments;
    }

    @GetMapping("/api/technicians/overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    public List<TechnicianProfileResponse> overview(@AuthenticationPrincipal Jwt jwt) {
        return overview.list(jwt.getSubject());
    }

    @GetMapping("/api/reports/{id}/technician-recommendations")
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    public List<TechnicianRecommendation> recommendations(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return recommendations.recommend(id, jwt.getSubject());
    }

    @GetMapping("/api/technicians/me/assignment-locations")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public List<AssignmentLocationResponse> assignments(@AuthenticationPrincipal Jwt jwt) {
        return assignments.getMine(jwt.getSubject());
    }
}
