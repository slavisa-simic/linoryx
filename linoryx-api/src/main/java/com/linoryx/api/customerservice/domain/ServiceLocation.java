package com.linoryx.api.customerservice.domain;

import com.linoryx.api.location.domain.LocationData;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "service_locations")
public class ServiceLocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 500)
    private String formattedAddress;
    @Column(nullable = false, length = 150)
    private String city;
    @Column(nullable = false, length = 2)
    private String countryCode;
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;
    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    protected ServiceLocation() {
    }

    public ServiceLocation(LocationData location) {
        this.formattedAddress = location.formattedAddress();
        this.city = location.city();
        this.countryCode = location.countryCode();
        this.latitude = location.latitude();
        this.longitude = location.longitude();
    }

    public Long getId() { return id; }
    public String getFormattedAddress() { return formattedAddress; }
    public String getCity() { return city; }
    public String getCountryCode() { return countryCode; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
}
