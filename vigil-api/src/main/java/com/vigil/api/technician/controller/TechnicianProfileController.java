package com.vigil.api.technician.controller;

import com.vigil.api.technician.dto.*;
import com.vigil.api.technician.service.TechnicianProfileService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/technician-profile/me")
@PreAuthorize("hasRole('TECHNICIAN')")
@SecurityRequirement(name = "bearerAuth")
public class TechnicianProfileController {
    private final TechnicianProfileService profiles;

    public TechnicianProfileController(TechnicianProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping
    public TechnicianProfileResponse get(@AuthenticationPrincipal Jwt jwt) {
        return profiles.getMine(jwt.getSubject());
    }

    @PutMapping
    public TechnicianProfileResponse update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateTechnicianProfileRequest request) {
        return profiles.updateMine(jwt.getSubject(), request);
    }
}
