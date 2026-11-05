package com.vigil.api.technician.dto;

import com.vigil.api.customerservice.domain.ServiceType;
import com.vigil.api.report.domain.*;
import java.math.BigDecimal;
import java.util.List;

public record AssignmentLocationResponse(Long locationId, String address, BigDecimal latitude, BigDecimal longitude,
        List<AssignedReport> reports) {
    public record AssignedReport(Long id, ServiceType serviceType, ReportCategory category, ReportStatus status) { }
}
