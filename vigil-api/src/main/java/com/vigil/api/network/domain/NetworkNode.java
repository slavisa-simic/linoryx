package com.vigil.api.network.domain;

import com.vigil.api.location.domain.LocationData;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "network_nodes")
public class NetworkNode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, updatable = false, length = 200)
    private String code;
    @Column(nullable = false, length = 150)
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NodeType nodeType;
    @Column(nullable = false, length = 500)
    private String location;
    @Column(nullable = false, length = 150)
    private String city;
    @Column(nullable = false, length = 2)
    private String countryCode;
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NodeStatus status;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected NetworkNode() {
    }

    public NetworkNode(String code, String name, NodeType nodeType, LocationData location, NodeStatus status) {
        this.code = code;
        this.createdAt = LocalDateTime.now();
        update(name, nodeType, location, status);
    }

    public void update(String name, NodeType nodeType, LocationData location, NodeStatus status) {
        this.name = name;
        this.nodeType = nodeType;
        this.status = status;
        if (location != null) {
            this.location = location.formattedAddress();
            this.city = location.city();
            this.countryCode = location.countryCode();
            this.latitude = location.latitude();
            this.longitude = location.longitude();
        }
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public NodeType getNodeType() { return nodeType; }
    public String getLocation() { return location; }
    public String getCity() { return city; }
    public String getCountryCode() { return countryCode; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public NodeStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
