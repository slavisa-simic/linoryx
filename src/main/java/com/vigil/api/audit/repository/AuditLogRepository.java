package com.vigil.api.audit.repository;

import com.vigil.api.audit.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByIncidentIdOrderByCreatedAtAsc(Long incidentId);

    List<AuditLog> findAllByOrderByCreatedAtDesc();
}