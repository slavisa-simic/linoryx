package com.linoryx.api.network.controller;

import com.linoryx.api.network.dto.*;
import com.linoryx.api.network.service.NetworkNodeService;
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
@RequestMapping("/api/network-nodes")
@PreAuthorize("hasRole('ADMIN')")
@SecurityRequirement(name = "bearerAuth")
public class NetworkNodeController {
    private final NetworkNodeService service;

    public NetworkNodeController(NetworkNodeService service) {
        this.service = service;
    }

    @GetMapping
    public Page<NetworkNodeResponse> list(@AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return service.list(jwt.getSubject(), pageable);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NetworkNodeResponse create(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateNetworkNodeRequest request) {
        return service.create(jwt.getSubject(), request);
    }

    @PutMapping("/{id}")
    public NetworkNodeResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id,
            @Valid @RequestBody UpdateNetworkNodeRequest request) {
        return service.update(jwt.getSubject(), id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        service.delete(jwt.getSubject(), id);
    }
}
