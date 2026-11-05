package com.vigil.api.technician.dto;

import com.vigil.api.technician.domain.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

public record TechnicianProfileResponse(Long userId, String name, BigDecimal latitude, BigDecimal longitude,
        TechnicianAvailability availability, Set<TechnicianSpecialization> specializations,
        LocalDateTime locationUpdatedAt, long activeReportCount) { }
