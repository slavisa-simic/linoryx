package com.vigil.api.audit.controller;

import com.vigil.api.audit.dto.AuditResponse;
import com.vigil.api.audit.service.AuditService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class AuditController {

    private final AuditService auditService;

    public AuditController(
            AuditService auditService
    ) {
        this.auditService = auditService;
    }

    @GetMapping("/incidents/{incidentId}/audit")
    @PreAuthorize(
            "hasAnyRole('USER', 'TECHNICIAN', 'ADMIN')"
    )
    public List<AuditResponse> getIncidentAudit(
            @PathVariable Long incidentId,
            @AuthenticationPrincipal Jwt jwt
    ) {

        return auditService.getIncidentAudit(
                incidentId,
                jwt.getSubject()
        );
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditResponse> getAllAuditLogs() {

        return auditService.getAllAuditLogs();
    }
}