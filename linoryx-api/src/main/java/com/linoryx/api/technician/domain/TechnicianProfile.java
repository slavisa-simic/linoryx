package com.linoryx.api.technician.domain;

import com.linoryx.api.user.domain.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "technician_profiles")
public class TechnicianProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitude;
    @Column(precision = 10, scale = 7)
    private BigDecimal longitude;
    @Enumerated(EnumType.STRING)
    private TechnicianAvailability availability;

    @ElementCollection
    @CollectionTable(name = "technician_specializations", joinColumns = @JoinColumn(name = "profile_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"profile_id", "specialization"}))
    @Enumerated(EnumType.STRING)
    @Column(name = "specialization", nullable = false)
    private Set<TechnicianSpecialization> specializations = new HashSet<>();

    private LocalDateTime locationUpdatedAt;

    protected TechnicianProfile() { }

    public TechnicianProfile(User user) {
        this.user = user;
    }

    public void update(BigDecimal latitude, BigDecimal longitude, TechnicianAvailability availability,
                       Set<TechnicianSpecialization> specializations) {
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Provide both latitude and longitude, or clear both.");
        }
        if (latitude != null && (latitude.abs().compareTo(BigDecimal.valueOf(90)) > 0
                || longitude.abs().compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90; longitude between -180 and 180.");
        }
        if (specializations == null) {
            throw new IllegalArgumentException("Choose valid specializations, or an empty selection.");
        }
        for (TechnicianSpecialization specialization : specializations) {
            if (specialization == null) throw new IllegalArgumentException("Choose valid specializations.");
        }
        if (latitude == null) {
            locationUpdatedAt = null;
        } else if (!sameCoordinate(this.latitude, latitude) || !sameCoordinate(this.longitude, longitude)) {
            locationUpdatedAt = LocalDateTime.now();
        }
        this.latitude = latitude;
        this.longitude = longitude;
        this.availability = availability;
        this.specializations.clear();
        this.specializations.addAll(specializations);
    }

    private boolean sameCoordinate(BigDecimal first, BigDecimal second) {
        return first != null && second != null && first.compareTo(second) == 0;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public TechnicianAvailability getAvailability() { return availability; }
    public Set<TechnicianSpecialization> getSpecializations() { return Set.copyOf(specializations); }
    public LocalDateTime getLocationUpdatedAt() { return locationUpdatedAt; }
}
