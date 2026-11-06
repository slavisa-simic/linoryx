package com.linoryx.api.report.repository;

import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.dto.IncidentReportCount;
import com.linoryx.api.technician.dto.AssignmentLocationRow;
import com.linoryx.api.technician.dto.TechnicianWorkload;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface CustomerReportRepository extends JpaRepository<CustomerReport, Long> {
    @EntityGraph(attributePaths = {"customerService.serviceLocation"})
    @Query("select report from CustomerReport report where report.id = :id")
    Optional<CustomerReport> findForRecommendation(Long id);

    @Query("""
            select new com.linoryx.api.technician.dto.TechnicianWorkload(report.assignedTechnician.id, count(report))
            from CustomerReport report
            where report.assignedTechnician.role = com.linoryx.api.user.domain.UserRole.TECHNICIAN
              and report.assignedTechnician.enabled = true
              and report.status in (com.linoryx.api.report.domain.ReportStatus.OPEN,
                com.linoryx.api.report.domain.ReportStatus.IN_PROGRESS, com.linoryx.api.report.domain.ReportStatus.RESOLVED)
            group by report.assignedTechnician.id
            """)
    List<TechnicianWorkload> countTechnicianWorkloads();

    @Query("""
            select new com.linoryx.api.technician.dto.AssignmentLocationRow(location.id, location.formattedAddress,
                location.latitude, location.longitude, report.id, service.serviceType, report.category, report.status)
            from CustomerReport report join report.customerService service join service.serviceLocation location
            where report.assignedTechnician.id = :technicianId
              and report.status in (com.linoryx.api.report.domain.ReportStatus.OPEN,
                com.linoryx.api.report.domain.ReportStatus.IN_PROGRESS, com.linoryx.api.report.domain.ReportStatus.RESOLVED)
            order by location.id, report.id
            """)
    List<AssignmentLocationRow> findAssignmentLocations(Long technicianId);

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
    long countByAssignedTechnicianIdAndStatusNot(Long technicianId, ReportStatus status);
    boolean existsByCustomerServiceCustomerIdAndStatusNot(Long customerId, ReportStatus status);
    boolean existsByIncidentId(Long incidentId);
    boolean existsByIncidentIdAndStatusNot(Long incidentId, ReportStatus status);

    @Query("""
            select new com.linoryx.api.report.dto.IncidentReportCount(report.incident.id, count(report),
                   sum(case when report.status = com.linoryx.api.report.domain.ReportStatus.CLOSED then 1 else 0 end))
            from CustomerReport report where report.incident.id in :incidentIds
            group by report.incident.id
            """)
    List<IncidentReportCount> countForIncidents(Collection<Long> incidentIds);
}
