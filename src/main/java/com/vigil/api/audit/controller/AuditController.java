package com.vigil.api.audit.controller;

import com.vigil.api.audit.dto.AuditResponse;
import com.vigil.api.audit.service.AuditService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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
    public Page<AuditResponse> getIncidentAudit(
            @PathVariable Long incidentId,
            @AuthenticationPrincipal Jwt jwt,

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.ASC
            )
            Pageable pageable
    ) {

        return auditService.getIncidentAudit(
                incidentId,
                jwt.getSubject(),
                pageable
        );
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AuditResponse> getAllAuditLogs(

            @PageableDefault(
                    size = 20,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            )
            Pageable pageable
    ) {

        return auditService.getAllAuditLogs(
                pageable
        );
    }
}