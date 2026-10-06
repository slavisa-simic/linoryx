package com.vigil.api.incident.repository;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface IncidentRepository
        extends JpaRepository<Incident, Long> {

    Page<Incident> findByStatus(
            IncidentStatus status,
            Pageable pageable
    );

    Page<Incident> findBySeverity(
            Severity severity,
            Pageable pageable
    );

    Page<Incident> findByCategory(
            IncidentCategory category,
            Pageable pageable
    );

    Page<Incident> findByTitleContainingIgnoreCase(
            String title,
            Pageable pageable
    );

    long countBySeverityAndStatusIn(
            Severity severity,
            Collection<IncidentStatus> statuses
    );
}
