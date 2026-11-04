package com.vigil.api.report.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vigil.api.customerservice.domain.ServiceType;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.report.domain.*;
import java.time.LocalDateTime;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ReportResponse(
        Long id, Long customerServiceId, ServiceType serviceType, String serviceAddress,
        ReportCategory category, String description, ReportStatus status, boolean userConfirmed, boolean customerReportedUnfixed,
        LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime resolvedAt, LocalDateTime closedAt,
        Long customerId, String customerName, String customerEmail,
        String networkNodeCode, String networkNodeName,
        Long assignedTechnicianId, String assignedTechnicianName,
        Long incidentId, String incidentTitle, IncidentStatus incidentStatus
) { }
