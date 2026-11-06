package com.linoryx.api.network.service;

import com.linoryx.api.customerservice.repository.CustomerServiceRepository;
import com.linoryx.api.exception.ResourceNotFoundException;
import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.location.service.LocationService;
import com.linoryx.api.network.domain.*;
import com.linoryx.api.network.dto.*;
import com.linoryx.api.network.repository.NetworkNodeRepository;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.service.UserService;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NetworkNodeService {
    private final NetworkNodeRepository repository;
    private final CustomerServiceRepository services;
    private final LocationService locations;
    private final NodeCodeService codes;
    private final UserService users;

    public NetworkNodeService(NetworkNodeRepository repository, CustomerServiceRepository services,
                              LocationService locations, NodeCodeService codes, UserService users) {
        this.repository = repository;
        this.services = services;
        this.locations = locations;
        this.codes = codes;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public Page<NetworkNodeResponse> list(String email, Pageable pageable) {
        requireAdmin(email);
        return repository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public NetworkNodeResponse create(String email, CreateNetworkNodeRequest request) {
        requireAdmin(email);
        LocationData location = locations.verify(request.location());
        String code = codes.generate(location.city(), request.nodeType());
        NodeStatus status = request.status();
        if (status == null) {
            status = NodeStatus.ACTIVE;
        }
        NetworkNode node = new NetworkNode(code, request.name().trim(), request.nodeType(), location, status);
        return toResponse(repository.save(node));
    }

    @Transactional
    public NetworkNodeResponse update(String email, Long id, UpdateNetworkNodeRequest request) {
        requireAdmin(email);
        NetworkNode node = find(id);
        LocationData location = null;
        if (request.location() != null) {
            location = locations.verify(request.location());
            if (!node.getCity().equalsIgnoreCase(location.city())
                    || !node.getCountryCode().equalsIgnoreCase(location.countryCode())) {
                throw new IllegalArgumentException("A node cannot be moved to another city or country. Create a new node there instead.");
            }
        }
        node.update(request.name().trim(), request.nodeType(), location, request.status());
        return toResponse(repository.save(node));
    }

    @Transactional
    public void delete(String email, Long id) {
        requireAdmin(email);
        NetworkNode node = find(id);
        if (services.existsByNetworkNodeId(id)) {
            throw new IllegalStateException("This node is referenced by customer services and cannot be deleted.");
        }
        repository.delete(node);
        repository.flush();
    }

    private NetworkNode find(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Network node not found."));
    }

    private void requireAdmin(String email) {
        if (users.getActiveUser(email).getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can manage network nodes.");
        }
    }

    private NetworkNodeResponse toResponse(NetworkNode node) {
        return new NetworkNodeResponse(node.getId(), node.getCode(), node.getName(), node.getNodeType(),
                node.getLocation(), node.getCity(), node.getCountryCode(), node.getLatitude(), node.getLongitude(),
                node.getStatus(), node.getCreatedAt(), services.countByNetworkNodeId(node.getId()));
    }
}
