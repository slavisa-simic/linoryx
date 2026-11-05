package com.vigil.api.technician.service;

import com.vigil.api.exception.*;
import com.vigil.api.report.domain.ReportStatus;
import com.vigil.api.report.repository.CustomerReportRepository;
import com.vigil.api.technician.domain.TechnicianProfile;
import com.vigil.api.technician.dto.*;
import com.vigil.api.technician.repository.TechnicianProfileRepository;
import com.vigil.api.user.domain.*;
import com.vigil.api.user.repository.UserRepository;
import com.vigil.api.user.service.UserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TechnicianProfileService {
    private final TechnicianProfileRepository profiles;
    private final UserRepository accounts;
    private final UserService users;
    private final CustomerReportRepository reports;

    public TechnicianProfileService(TechnicianProfileRepository profiles, UserRepository accounts, UserService users,
                                     CustomerReportRepository reports) {
        this.profiles = profiles;
        this.accounts = accounts;
        this.users = users;
        this.reports = reports;
    }

    @Transactional(readOnly = true)
    public TechnicianProfileResponse getMine(String email) {
        User user = users.getActiveUser(email);
        requireTechnician(user);
        return TechnicianProfileMapper.toResponse(user, find(user), workload(user));
    }

    @Transactional
    public TechnicianProfileResponse updateMine(String email, UpdateTechnicianProfileRequest request) {
        // Role changes and assignment lock this same account before changing operational data.
        User user = accounts.findByEmailForUpdate(email)
                .orElseThrow(() -> new UnauthorizedException("Authentication required"));
        if (!user.isEnabled()) throw new UnauthorizedException("Authentication required");
        requireTechnician(user);
        TechnicianProfile profile = find(user);
        profile.update(request.latitude(), request.longitude(), request.availability(), request.specializations());
        return TechnicianProfileMapper.toResponse(user, profile, workload(user));
    }

    private long workload(User user) {
        return reports.countByAssignedTechnicianIdAndStatusNot(user.getId(), ReportStatus.CLOSED);
    }

    private TechnicianProfile find(User user) {
        return profiles.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Technician profile not found. Contact an administrator."));
    }

    private void requireTechnician(User user) {
        if (user.getRole() != UserRole.TECHNICIAN) {
            throw new AccessDeniedException("Only technicians can access My Profile.");
        }
    }
}
