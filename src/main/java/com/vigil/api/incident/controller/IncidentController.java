package com.vigil.api.incident.controller;

import com.vigil.api.incident.dto.AssignIncidentRequest;
import com.vigil.api.incident.dto.CreateIncidentRequest;
import com.vigil.api.incident.dto.IncidentResponse;
import com.vigil.api.incident.services.IncidentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("api/incidents")
public class IncidentController {

    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
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
    public List<IncidentResponse> getAllIncidents(){
        return incidentService.getAllIncidents();
    }

    @GetMapping("/{id}")
    public IncidentResponse getResponseById(@PathVariable Long id){
        return incidentService.getIncident(id);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public IncidentResponse assignIncident(
            @PathVariable Long id,
            @Valid @RequestBody AssignIncidentRequest request
    ) {
        return incidentService.assignIncident(
                id,
                request.technicianId()
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
