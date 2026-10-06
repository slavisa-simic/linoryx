package com.vigil.api.audit.domain;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.user.domain.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_user_id")
    private User targetUser;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected AuditLog() {
    }

    public AuditLog(
            Incident incident,
            User actor,
            AuditAction action
    ) {
        this(incident, actor, action, null);
    }

    public AuditLog(
            Incident incident,
            User actor,
            AuditAction action,
            User targetUser
    ) {
        this.incident = incident;
        this.actor = actor;
        this.action = action;
        this.targetUser = targetUser;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Incident getIncident() {
        return incident;
    }

    public User getActor() {
        return actor;
    }

    public AuditAction getAction() {
        return action;
    }

    public User getTargetUser() {
        return targetUser;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
