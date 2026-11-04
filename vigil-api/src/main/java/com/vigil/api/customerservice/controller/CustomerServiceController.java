package com.vigil.api.customerservice.controller;

import com.vigil.api.customerservice.dto.*;
import com.vigil.api.customerservice.service.CustomerServiceService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@SecurityRequirement(name = "bearerAuth")
public class CustomerServiceController {
    private final CustomerServiceService service;

    public CustomerServiceController(CustomerServiceService service) {
        this.service = service;
    }

    @GetMapping("/customer-services")
    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    public Page<CustomerServiceResponse> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Long customerId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return service.list(jwt.getSubject(), customerId, pageable);
    }

    @PostMapping("/users/{customerId}/services")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerServiceResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long customerId,
            @Valid @RequestBody CreateCustomerServiceRequest request) {
        return service.create(jwt.getSubject(), customerId, request);
    }

    @PutMapping("/customer-services/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CustomerServiceResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody UpdateCustomerServiceRequest request) {
        return service.update(jwt.getSubject(), id, request);
    }

    @PatchMapping("/customer-services/{id}/terminate")
    @PreAuthorize("hasRole('ADMIN')")
    public CustomerServiceResponse terminate(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return service.terminate(jwt.getSubject(), id);
    }
}
