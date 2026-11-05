package com.vigil.api.user.controller;

import com.vigil.api.user.dto.TechnicianResponse;
import com.vigil.api.user.service.UserService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/technicians")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Technicians", description = "Enabled technician accounts")
public class TechnicianController {
    private final UserService userService;

    public TechnicianController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DISPATCHER')")
    public List<TechnicianResponse> getTechnicians(@AuthenticationPrincipal Jwt jwt) {
        return userService.getTechnicians(jwt.getSubject());
    }
}
