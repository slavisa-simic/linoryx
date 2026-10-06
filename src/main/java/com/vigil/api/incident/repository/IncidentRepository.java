package com.vigil.api.incident.repository;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;

public interface IncidentRepository
        extends JpaRepository<Incident, Long> {

    @Query("""
            select incident from Incident incident
            left join incident.assignedTo technician
            where (:technicianId is null or technician.id = :technicianId)
              and (:status is null or incident.status = :status)
              and (:severity is null or incident.severity = :severity)
              and (:category is null or incident.category = :category)
              and (:search is null or lower(incident.title) like lower(concat('%', :search, '%')) escape '\\')
            """)
    Page<Incident> findVisibleIncidents(
            @Param("technicianId") Long technicianId,
            @Param("status") IncidentStatus status,
            @Param("severity") Severity severity,
            @Param("category") IncidentCategory category,
            @Param("search") String search,
            Pageable pageable
    );

    long countBySeverityAndStatusIn(
            Severity severity,
            Collection<IncidentStatus> statuses
    );
}
