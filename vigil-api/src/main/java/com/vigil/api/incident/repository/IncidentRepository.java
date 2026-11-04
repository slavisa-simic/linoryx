package com.vigil.api.incident.repository;

import com.vigil.api.incident.domain.Incident;
import com.vigil.api.incident.domain.IncidentCategory;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.domain.Severity;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentRepository
        extends JpaRepository<Incident, Long> {

    boolean existsByAssignedToIdAndLegacyFalseAndStatusIn(Long technicianId, Collection<IncidentStatus> statuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select incident from Incident incident where incident.id = :id")
    Optional<Incident> findForUpdate(Long id);

    @EntityGraph(attributePaths = {"createdBy", "assignedTo"})
    @Query("""
            select incident from Incident incident
            left join incident.assignedTo technician
            where (:technicianId is null or technician.id = :technicianId
                  or exists (select report.id from CustomerReport report where report.incident = incident
                             and report.assignedTechnician.id = :technicianId))
              and (:creatorId is null or incident.createdBy.id = :creatorId)
              and (:status is null or incident.status = :status)
              and (:severity is null or incident.severity = :severity)
              and (:category is null or incident.category = :category)
              and (:search is null or lower(incident.title) like lower(concat('%', cast(:search as String), '%')) escape '\\')
            """)
    Page<Incident> findVisibleIncidents(
            @Param("technicianId") Long technicianId,
            @Param("creatorId") Long creatorId,
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
