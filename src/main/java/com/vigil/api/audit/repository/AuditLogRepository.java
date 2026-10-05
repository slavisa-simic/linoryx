package com.vigil.api.audit.repository;

import com.vigil.api.audit.domain.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByIncidentIdOrderByCreatedAtAsc(
            Long incidentId,
            Pageable pageable
    );

    Page<AuditLog> findAllByOrderByCreatedAtDesc(
            Pageable pageable
    );
}