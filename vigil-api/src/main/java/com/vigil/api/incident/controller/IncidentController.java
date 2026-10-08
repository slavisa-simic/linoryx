package com.vigil.api.incident.controller;

import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import com.vigil.api.incident.dto.AssignIncidentRequest;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.dto.IncidentResponse;
import com.vigil.api.incident.services.IncidentService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/incidents")
@SecurityRequirement(name = "bearerAuth")
@Tag(
        name = "Incidents",
        description = "Incident management and workflow"
)
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse createIncident(
            @Valid @RequestBody CreateIncidentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return incidentService.createIncident(
                request,
                jwt.getSubject()
        );
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'ADMIN')")
    public Page<IncidentResponse> getIncidents(

            @RequestParam(required = false)
            IncidentStatus status,

            @RequestParam(required = false)
            Severity severity,

            @RequestParam(required = false)
            IncidentCategory category,

            @RequestParam(required = false)
            String search,

            @AuthenticationPrincipal Jwt jwt,

            @ParameterObject
            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    ) {

        return incidentService.getAllIncidents(
                status,
                severity,
                category,
                search,
                jwt.getSubject(),
                pageable
        );
    }

    @GetMapping("/{id}")
    public IncidentResponse getResponseById(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return incidentService.getIncident(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public IncidentResponse assignIncident(
            @PathVariable Long id,
            @Valid @RequestBody AssignIncidentRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return incidentService.assignIncident(
                id,
                request.technicianId(),
                jwt.getSubject()
        );
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'ADMIN')")
    public IncidentResponse startProgress(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return incidentService.startProgress(
                id,
                jwt.getSubject()
        );
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'ADMIN')")
    public IncidentResponse resolveIncident(
            @PathVariable Long id,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return incidentService.resolveIncident(
                id,
                jwt.getSubject()
        );
    }

}
