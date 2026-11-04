package com.vigil.api.location.controller;

import com.vigil.api.location.dto.LocationSuggestion;
import com.vigil.api.location.service.LocationService;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class LocationController {
    private final LocationService locationService;
    private final UserService userService;

    public LocationController(LocationService locationService, UserService userService) {
        this.locationService = locationService;
        this.userService = userService;
    }

    @GetMapping("/search")
    public List<LocationSuggestion> search(@RequestParam String query, @AuthenticationPrincipal Jwt jwt) {
        if (userService.getActiveUser(jwt.getSubject()).getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can search service locations.");
        }
        return locationService.search(query);
    }
}
