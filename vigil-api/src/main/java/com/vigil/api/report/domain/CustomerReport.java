package com.vigil.api.report.domain;

import com.vigil.api.customerservice.domain.CustomerService;
import com.vigil.api.incident.domain.Incident;
import com.vigil.api.user.domain.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_reports", indexes = {
        @Index(name = "report_service_idx", columnList = "customer_service_id"),
        @Index(name = "report_incident_idx", columnList = "incident_id"),
        @Index(name = "report_technician_idx", columnList = "assigned_technician_id")
})
public class CustomerReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private CustomerService customerService;
    @ManyToOne(fetch = FetchType.LAZY)
    private Incident incident;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportCategory category;
    @Column(nullable = false, length = 500)
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReportStatus status;
    @ManyToOne(fetch = FetchType.LAZY)
    private User assignedTechnician;
    @Column(nullable = false)
    private boolean userConfirmed;
    @Column(nullable = false)
    private boolean customerReportedUnfixed;
    @Column(nullable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;

    protected CustomerReport() { }

    public CustomerReport(CustomerService service, ReportCategory category, String description) {
        if (category == null || description == null || description.isBlank() || description.length() > 500) {
            throw new IllegalArgumentException("Choose a category and enter a description of at most 500 characters.");
        }
        this.customerService = service;
        this.category = category;
        this.description = description.trim();
        this.status = ReportStatus.OPEN;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = createdAt;
    }

    public void linkTo(Incident incident) {
        if (this.incident != null || status == ReportStatus.CLOSED) {
            throw new IllegalStateException("Only unlinked reports that are not closed can be attached.");
        }
        this.incident = incident;
        this.updatedAt = LocalDateTime.now();
    }

    public void assignTo(User technician) {
        if (status == ReportStatus.CLOSED) {
            throw new IllegalStateException("Closed reports cannot be assigned.");
        }
        if (incident == null) {
            throw new IllegalStateException("Link the report to an incident before assigning a technician.");
        }
        this.assignedTechnician = technician;
        this.updatedAt = LocalDateTime.now();
    }

    public void start() {
        requireStatus(ReportStatus.OPEN);
        this.status = ReportStatus.IN_PROGRESS;
        this.updatedAt = LocalDateTime.now();
    }

    public void resolve() {
        requireStatus(ReportStatus.IN_PROGRESS);
        this.status = ReportStatus.RESOLVED;
        this.userConfirmed = false;
        this.customerReportedUnfixed = false;
        this.resolvedAt = LocalDateTime.now();
        this.updatedAt = resolvedAt;
    }

    public void confirmFixed() {
        requireStatus(ReportStatus.RESOLVED);
        this.userConfirmed = true;
        this.updatedAt = LocalDateTime.now();
    }

    public void stillNotWorking() {
        requireStatus(ReportStatus.RESOLVED);
        this.status = ReportStatus.IN_PROGRESS;
        this.customerReportedUnfixed = true;
        this.userConfirmed = false;
        this.resolvedAt = null;
        this.updatedAt = LocalDateTime.now();
    }

    public void close() {
        requireStatus(ReportStatus.RESOLVED);
        if (!userConfirmed) {
            throw new IllegalStateException("The customer must confirm the fix before this report can close.");
        }
        this.status = ReportStatus.CLOSED;
        this.closedAt = LocalDateTime.now();
        this.updatedAt = closedAt;
    }

    private void requireStatus(ReportStatus expected) {
        if (status != expected) {
            throw new IllegalStateException("This action requires report status " + expected + ".");
        }
    }

    public boolean isCustomerReportedUnfixed() { return customerReportedUnfixed; }
    public Long getId() { return id; }
    public CustomerService getCustomerService() { return customerService; }
    public Incident getIncident() { return incident; }
    public ReportCategory getCategory() { return category; }
    public String getDescription() { return description; }
    public ReportStatus getStatus() { return status; }
    public User getAssignedTechnician() { return assignedTechnician; }
    public boolean isUserConfirmed() { return userConfirmed; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
    public LocalDateTime getClosedAt() { return closedAt; }
}
