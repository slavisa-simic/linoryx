package com.linoryx.api.report.controller;

import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.dto.*;
import com.linoryx.api.report.service.CustomerReportService;
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
@RequestMapping("/api/reports")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Customer reports", description = "Customer reporting, technician work and confirmation")
public class CustomerReportController {
    private final CustomerReportService reports;

    public CustomerReportController(CustomerReportService reports) {
        this.reports = reports;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('USER')")
    public ReportResponse create(@Valid @RequestBody CreateReportRequest request, @AuthenticationPrincipal Jwt jwt) {
        return reports.create(request, jwt.getSubject());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public Page<ReportResponse> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Long incidentId,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportCategory category,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return reports.list(jwt.getSubject(), "all", incidentId, status, category, pageable);
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('USER')")
    public Page<ReportResponse> my(@AuthenticationPrincipal Jwt jwt,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return reports.list(jwt.getSubject(), "my", null, null, null, pageable);
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public Page<ReportResponse> assigned(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Long incidentId,
            @ParameterObject @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return reports.list(jwt.getSubject(), "assigned", incidentId, null, null, pageable);
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ReportResponse assign(@PathVariable Long id, @Valid @RequestBody AssignReportRequest request,
                                 @AuthenticationPrincipal Jwt jwt) {
        return reports.assign(id, request.technicianId(), jwt.getSubject());
    }

    @PatchMapping("/{id}/start")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ReportResponse start(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return reports.start(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/resolve")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ReportResponse resolve(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return reports.resolve(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/confirm-fixed")
    @PreAuthorize("hasRole('USER')")
    public ReportResponse confirmFixed(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return reports.confirmFixed(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/still-not-working")
    @PreAuthorize("hasRole('USER')")
    public ReportResponse stillNotWorking(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return reports.stillNotWorking(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('DISPATCHER', 'ADMIN')")
    public ReportResponse close(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return reports.close(id, jwt.getSubject());
    }
}
