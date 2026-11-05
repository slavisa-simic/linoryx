package com.vigil.api.technician.service;

import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.technician.dto.*;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.service.UserService;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TechnicianAssignmentMapService {
    private final UserService users;
    private final CustomerReportRepository reports;

    public TechnicianAssignmentMapService(UserService users, CustomerReportRepository reports) {
        this.users = users;
        this.reports = reports;
    }

    @Transactional(readOnly = true)
    public List<AssignmentLocationResponse> getMine(String email) {
        User actor = users.getActiveUser(email);
        if (actor.getRole() != UserRole.TECHNICIAN) {
            throw new AccessDeniedException("Only technicians can view their assignment map.");
        }
        Map<Long, AssignmentLocationResponse> locations = new LinkedHashMap<>();
        for (AssignmentLocationRow row : reports.findAssignmentLocations(actor.getId())) {
            AssignmentLocationResponse location = locations.get(row.locationId());
            if (location == null) {
                location = new AssignmentLocationResponse(row.locationId(), row.address(), row.latitude(), row.longitude(), new ArrayList<>());
                locations.put(row.locationId(), location);
            }
            location.reports().add(new AssignmentLocationResponse.AssignedReport(row.reportId(), row.serviceType(), row.category(), row.status()));
        }
        return new ArrayList<>(locations.values());
    }
}
