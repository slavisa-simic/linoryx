package com.linoryx.api.technician.service;

import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.technician.domain.TechnicianProfile;
import com.linoryx.api.technician.dto.*;
import com.linoryx.api.technician.repository.TechnicianProfileRepository;
import com.linoryx.api.user.domain.*;
import com.linoryx.api.user.repository.UserRepository;
import com.linoryx.api.user.service.UserService;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TechnicianOverviewService {
    private final UserService users;
    private final UserRepository accounts;
    private final TechnicianProfileRepository profiles;
    private final CustomerReportRepository reports;

    public TechnicianOverviewService(UserService users, UserRepository accounts,
                                     TechnicianProfileRepository profiles, CustomerReportRepository reports) {
        this.users = users;
        this.accounts = accounts;
        this.profiles = profiles;
        this.reports = reports;
    }

    @Transactional(readOnly = true)
    public List<TechnicianProfileResponse> list(String email) {
        User actor = users.getActiveUser(email);
        if (actor.getRole() != UserRole.ADMIN && actor.getRole() != UserRole.DISPATCHER) {
            throw new AccessDeniedException("Only dispatchers and administrators can view technician profiles.");
        }
        List<User> technicians = accounts.findAllByRoleAndEnabledTrue(UserRole.TECHNICIAN);
        Map<Long, TechnicianProfile> profileByUser = new HashMap<>();
        for (TechnicianProfile profile : profiles.findActiveTechnicianProfiles()) {
            profileByUser.put(profile.getUser().getId(), profile);
        }
        Map<Long, Long> workloads = new HashMap<>();
        for (TechnicianWorkload workload : reports.countTechnicianWorkloads()) {
            workloads.put(workload.userId(), workload.count());
        }
        List<TechnicianProfileResponse> result = new ArrayList<>();
        for (User technician : technicians) {
            result.add(TechnicianProfileMapper.toResponse(technician, profileByUser.get(technician.getId()),
                    workloads.getOrDefault(technician.getId(), 0L)));
        }
        result.sort(Comparator.comparing(TechnicianProfileResponse::userId));
        return result;
    }

}
