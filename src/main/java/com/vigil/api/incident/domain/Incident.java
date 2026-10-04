package com.vigil.api.incident.domain;

import com.vigil.api.user.domain.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private User assignedTo;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    protected Incident(){

    }

    public Incident(
            String title,
            String description,
            Severity severity,
            IncidentCategory category,
            User createdBy
    ) {
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.category = category;
        this.createdBy = createdBy;

        this.status = IncidentStatus.OPEN;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Severity getSeverity() {
        return severity;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public IncidentCategory getCategory() {
        return category;
    }

    public User getCreatedBy() {
        return createdBy;
    }

    public User getAssignedTo() {
        return assignedTo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void assignTo(User technician) {

        if (status == IncidentStatus.RESOLVED ||
                status == IncidentStatus.CLOSED) {
            throw new IllegalStateException(
                    "Resolved or closed incident cannot be assigned"
            );
        }

        this.assignedTo = technician;
        this.updatedAt = LocalDateTime.now();
    }

    public void startProgress() {

        if (assignedTo == null) {
            throw new IllegalStateException(
                    "Incident must be assigned before work can start"
            );
        }

        if (status != IncidentStatus.OPEN) {
            throw new IllegalStateException(
                    "Only open incidents can be started"
            );
        }

        this.status = IncidentStatus.IN_PROGRESS;
        this.updatedAt = LocalDateTime.now();
    }

    public void resolve() {

        if (status != IncidentStatus.IN_PROGRESS) {
            throw new IllegalStateException(
                    "Only incidents in progress can be resolved"
            );
        }

        this.status = IncidentStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
        this.updatedAt = this.resolvedAt;
    }

    public void close(){
        this.status = IncidentStatus.CLOSED;
        this.updatedAt = LocalDateTime.now();
    }
}
