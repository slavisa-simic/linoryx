package com.vigil.api.incident.controller;

import com.vigil.api.incident.domain.*;
import com.vigil.api.incident.dto.*;
import com.vigil.api.incident.services.IncidentService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/incidents")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Incidents", description = "Dispatcher-managed incident workflow")
public class IncidentController {
    private final IncidentService incidents;

    public IncidentController(IncidentService incidents) {
        this.incidents = incidents;
    }

    @PostMapping("/from-reports")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse create(@Valid @RequestBody CreateIncidentRequest request, @AuthenticationPrincipal Jwt jwt) {
        return incidents.createIncident(request, jwt.getSubject());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'DISPATCHER', 'ADMIN')")
    public Page<IncidentResponse> list(@RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) IncidentCategory category,
            @RequestParam(required = false) String search, @AuthenticationPrincipal Jwt jwt,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return incidents.getAllIncidents(status, severity, category, search, jwt.getSubject(), pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'DISPATCHER', 'ADMIN')")
    public IncidentResponse get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return incidents.getIncident(id, jwt.getSubject());
    }

    @PostMapping("/{id}/reports")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public IncidentResponse attach(@PathVariable Long id, @Valid @RequestBody AttachReportsRequest request,
                                    @AuthenticationPrincipal Jwt jwt) {
        return incidents.attachReports(id, request.reportIds(), jwt.getSubject());
    }

    @PatchMapping("/{id}/category")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public IncidentResponse changeCategory(@PathVariable Long id,
            @Valid @RequestBody UpdateIncidentCategoryRequest request, @AuthenticationPrincipal Jwt jwt) {
        return incidents.changeCategory(id, request.category(), jwt.getSubject());
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public IncidentResponse start(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return incidents.startProgress(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public IncidentResponse close(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return incidents.closeIncident(id, jwt.getSubject());
    }
}
