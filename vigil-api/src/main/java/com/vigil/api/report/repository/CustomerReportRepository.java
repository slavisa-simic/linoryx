package com.vigil.api.report.repository;

import com.vigil.api.report.domain.*;
import com.vigil.api.report.dto.IncidentReportCount;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface CustomerReportRepository extends JpaRepository<CustomerReport, Long> {
    @EntityGraph(attributePaths = {"customerService.customer", "customerService.serviceLocation",
            "customerService.networkNode", "assignedTechnician", "incident"})
    @Query("""
            select report from CustomerReport report
            where (:customerId is null or report.customerService.customer.id = :customerId)
              and (:technicianId is null or report.assignedTechnician.id = :technicianId)
              and (:incidentId is null or report.incident.id = :incidentId)
              and (:status is null or report.status = :status)
              and (:category is null or report.category = :category)
            """)
    Page<CustomerReport> findVisible(Long customerId, Long technicianId, Long incidentId,
                                     ReportStatus status, ReportCategory category, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select report from CustomerReport report where report.id = :id")
    Optional<CustomerReport> findForUpdate(Long id);

    @Query("select report.incident.id from CustomerReport report where report.id = :id")
    Long findIncidentId(Long id);

    boolean existsByIncidentIdAndAssignedTechnicianId(Long incidentId, Long technicianId);
    boolean existsByAssignedTechnicianIdAndStatusNot(Long technicianId, ReportStatus status);
    boolean existsByCustomerServiceCustomerIdAndStatusNot(Long customerId, ReportStatus status);
    boolean existsByIncidentId(Long incidentId);
    boolean existsByIncidentIdAndStatusNot(Long incidentId, ReportStatus status);

    @Query("""
            select new com.vigil.api.report.dto.IncidentReportCount(report.incident.id, count(report),
                   sum(case when report.status = com.vigil.api.report.domain.ReportStatus.CLOSED then 1 else 0 end))
            from CustomerReport report where report.incident.id in :incidentIds
            group by report.incident.id
            """)
    List<IncidentReportCount> countForIncidents(Collection<Long> incidentIds);
}
