package com.linoryx.api.customerservice.domain;

import com.linoryx.api.network.domain.NetworkNode;
import com.linoryx.api.user.domain.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_services", indexes = {
        @Index(name = "customer_service_customer_idx", columnList = "customer_id"),
        @Index(name = "customer_service_node_idx", columnList = "network_node_id")
})
public class CustomerService {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceType serviceType;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_location_id", nullable = false)
    private ServiceLocation serviceLocation;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "network_node_id", nullable = false)
    private NetworkNode networkNode;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceStatus status;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected CustomerService() {
    }

    public CustomerService(User customer, ServiceType type, ServiceLocation location, NetworkNode node, ServiceStatus status) {
        this.customer = customer;
        this.createdAt = LocalDateTime.now();
        update(type, location, node, status);
    }

    public void update(ServiceType type, ServiceLocation location, NetworkNode node, ServiceStatus status) {
        this.serviceType = type;
        this.serviceLocation = location;
        this.networkNode = node;
        this.status = status;
    }

    public void terminate() {
        this.status = ServiceStatus.TERMINATED;
    }

    public Long getId() { return id; }
    public User getCustomer() { return customer; }
    public ServiceType getServiceType() { return serviceType; }
    public ServiceLocation getServiceLocation() { return serviceLocation; }
    public NetworkNode getNetworkNode() { return networkNode; }
    public ServiceStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
