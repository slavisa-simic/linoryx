package com.vigil.api.customerservice.service;

import com.vigil.api.customerservice.domain.*;
import com.vigil.api.customerservice.dto.*;
import com.vigil.api.customerservice.repository.*;
import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.location.domain.LocationData;
import com.vigil.api.location.service.LocationService;
import com.vigil.api.network.domain.NetworkNode;
import com.vigil.api.network.repository.NetworkNodeRepository;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerServiceService {
    private final CustomerServiceRepository repository;
    private final ServiceLocationRepository serviceLocations;
    private final NetworkNodeRepository nodes;
    private final UserRepository userRepository;
    private final UserService users;
    private final LocationService locations;

    public CustomerServiceService(CustomerServiceRepository repository, ServiceLocationRepository serviceLocations,
                                  NetworkNodeRepository nodes, UserRepository userRepository,
                                  UserService users, LocationService locations) {
        this.repository = repository;
        this.serviceLocations = serviceLocations;
        this.nodes = nodes;
        this.userRepository = userRepository;
        this.users = users;
        this.locations = locations;
    }

    @Transactional(readOnly = true)
    public Page<CustomerServiceResponse> list(String email, Long customerId, Pageable pageable) {
        User user = users.getActiveUser(email);
        if (user.getRole() == UserRole.USER) {
            if (customerId != null && !customerId.equals(user.getId())) {
                throw new AccessDeniedException("You can only view your own services.");
            }
            return repository.findByCustomerId(user.getId(), pageable).map(this::toResponse);
        }
        if (user.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can view other customers' services.");
        }
        if (customerId != null) {
            return repository.findByCustomerId(customerId, pageable).map(this::toResponse);
        }
        return repository.findAll(pageable).map(this::toResponse);
    }

    @Transactional
    public CustomerServiceResponse create(String email, Long customerId, CreateCustomerServiceRequest request) {
        requireAdminForUpdate(email);
        User customer = customer(customerId);
        NetworkNode node = node(request.networkNodeId());
        ServiceLocation location = serviceLocations.save(new ServiceLocation(locations.verify(request.location())));
        ServiceStatus status = request.status();
        if (status == null) {
            status = ServiceStatus.ACTIVE;
        }
        CustomerService item = new CustomerService(customer, request.serviceType(), location, node, status);
        return toResponse(repository.save(item));
    }

    @Transactional
    public CustomerServiceResponse update(String email, Long id, UpdateCustomerServiceRequest request) {
        requireAdminForUpdate(email);
        CustomerService item = find(id);
        customer(item.getCustomer().getId());
        NetworkNode node = node(request.networkNodeId());
        ServiceLocation location = item.getServiceLocation();
        if (request.location() != null) {
            // A new address record keeps other services at the old address unchanged.
            location = serviceLocations.save(new ServiceLocation(locations.verify(request.location())));
        }
        item.update(request.serviceType(), location, node, request.status());
        return toResponse(repository.save(item));
    }

    @Transactional
    public CustomerServiceResponse terminate(String email, Long id) {
        requireAdminForUpdate(email);
        CustomerService item = find(id);
        item.terminate();
        return toResponse(repository.save(item));
    }

    private void requireAdminForUpdate(String email) {
        // Use the same lock as account role changes, so assignment cannot race a role change.
        userRepository.findByRoleOrderByIdAsc(UserRole.ADMIN);
        if (users.getActiveUser(email).getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can manage customer services.");
        }
    }

    private User customer(Long id) {
        User customer = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found."));
        if (customer.getRole() != UserRole.USER) {
            throw new IllegalArgumentException("Only USER accounts can receive customer services.");
        }
        return customer;
    }

    private NetworkNode node(Long id) {
        return nodes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Network node not found."));
    }

    private CustomerService find(Long id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Customer service not found."));
    }

    private CustomerServiceResponse toResponse(CustomerService item) {
        ServiceLocation location = item.getServiceLocation();
        NetworkNode node = item.getNetworkNode();
        LocationData address = new LocationData(location.getFormattedAddress(), location.getCity(),
                location.getCountryCode(), location.getLatitude(), location.getLongitude());
        return new CustomerServiceResponse(item.getId(), item.getCustomer().getId(), item.getServiceType(),
                location.getId(), address, node.getId(), node.getCode(), node.getName(), item.getStatus(), item.getCreatedAt());
    }
}
