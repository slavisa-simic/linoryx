package com.vigil.api.technician.dto;

import com.vigil.api.customerservice.domain.ServiceType;
import com.vigil.api.report.domain.*;
import java.math.BigDecimal;

// Only these fields are selected from the database for the technician map.
public record AssignmentLocationRow(Long locationId, String address, BigDecimal latitude, BigDecimal longitude,
        Long reportId, ServiceType serviceType, ReportCategory category, ReportStatus status) { }
