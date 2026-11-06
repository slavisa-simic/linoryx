package com.linoryx.api.user.service;

import com.linoryx.api.audit.domain.AuditAction;
import com.linoryx.api.audit.domain.AuditLog;
import com.linoryx.api.audit.repository.AuditLogRepository;
import com.linoryx.api.customerservice.domain.ServiceStatus;
import com.linoryx.api.customerservice.repository.CustomerServiceRepository;
import com.linoryx.api.exception.ResourceNotFoundException;
import com.linoryx.api.exception.UnauthorizedException;
import com.linoryx.api.incident.domain.IncidentStatus;
import com.linoryx.api.incident.repository.IncidentRepository;
import com.linoryx.api.report.domain.ReportStatus;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.user.domain.User;
import com.linoryx.api.user.domain.UserRole;
import com.linoryx.api.user.dto.TechnicianResponse;
import com.linoryx.api.user.dto.UserResponse;
import com.linoryx.api.user.repository.UserRepository;
import com.linoryx.api.technician.domain.TechnicianProfile;
import com.linoryx.api.technician.repository.TechnicianProfileRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final CustomerReportRepository reports;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final IncidentRepository incidentRepository;
    private final CustomerServiceRepository customerServiceRepository;
    private final TechnicianProfileRepository profiles;

    public UserService(
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            IncidentRepository incidentRepository,
            CustomerServiceRepository customerServiceRepository,
            CustomerReportRepository reports,
            TechnicianProfileRepository profiles
    ) {
        this.userRepository = userRepository;
        this.reports = reports;
        this.auditLogRepository = auditLogRepository;
        this.incidentRepository = incidentRepository;
        this.customerServiceRepository = customerServiceRepository;
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public User getActiveUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("Authentication required"));

        if (!user.isEnabled()) {
            throw new UnauthorizedException("Authentication required");
        }

        return user;
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        return toResponse(getActiveUser(email));
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> getAllUsers(
            String currentUserEmail,
            Pageable pageable
    ) {
        User currentUser = getActiveUser(currentUserEmail);
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can view all users");
        }

        return userRepository
                .findAll(pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<TechnicianResponse> getTechnicians(String currentUserEmail) {
        User currentUser = getActiveUser(currentUserEmail);
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.DISPATCHER) {
            throw new AccessDeniedException("Only administrators and dispatchers can list technicians");
        }

        return userRepository.findAllByRoleAndEnabledTrue(UserRole.TECHNICIAN)
                .stream()
                .map(user -> new TechnicianResponse(user.getId(), user.getFirstName(), user.getLastName()))
                .toList();
    }

    @Transactional
    public UserResponse changeUserRole(
            String currentUserEmail,
            Long userId,
            UserRole role
    ) {
        User currentUser = getAdminForUpdate(currentUserEmail);
        User user = userRepository.findForUpdate(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found!"
                        )
                );

        if (user.getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You cannot change your own role.");
        }
        if (role == null) {
            throw new IllegalArgumentException("Choose a role.");
        }
        if (user.getRole() == role) {
            if (role == UserRole.TECHNICIAN) createProfileIfMissing(user);
            return toResponse(user);
        }
        ensureAnotherAdmin(user);
        ensureNoActiveAssignedWork(user);

        if (user.getRole() == UserRole.USER && reports.existsByCustomerServiceCustomerIdAndStatusNot(user.getId(), ReportStatus.CLOSED)) {
            throw new IllegalStateException("Close this customer's reports before changing their role.");
        }
        if (user.getRole() == UserRole.USER && customerServiceRepository.existsByCustomerIdAndStatusNot(
                user.getId(), ServiceStatus.TERMINATED)) {
            throw new IllegalStateException("Terminate this customer's services before changing their role.");
        }

        UserRole previousRole = user.getRole();
        user.changeRole(role);

        User savedUser = userRepository.save(user);
        if (previousRole == UserRole.TECHNICIAN) {
            profiles.findByUserId(userId).ifPresent(profiles::delete);
            // Flush deletion before a later role grant can insert a fresh profile.
            profiles.flush();
        }
        if (role == UserRole.TECHNICIAN) createProfileIfMissing(savedUser);
        auditLogRepository.save(new AuditLog(currentUser, savedUser, previousRole, role));

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse disableUser(String currentUserEmail, Long userId){
        User currentUser = getAdminForUpdate(currentUserEmail);
        User user = userRepository
                .findForUpdate(userId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "User not found!"
                        )
                );

        ensureAnotherAdmin(user);
        if (user.getId().equals(currentUser.getId())) {
            throw new IllegalStateException("You cannot disable your own account.");
        }
        if (!user.isEnabled()) {
            return toResponse(user);
        }
        ensureNoActiveAssignedWork(user);
        user.disable();

        User savedUser = userRepository.save(user);
        auditLogRepository.save(new AuditLog(null, currentUser, AuditAction.USER_DISABLED, savedUser));

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse enableUser(String currentUserEmail, Long userId) {
        User currentUser = getAdminForUpdate(currentUserEmail);
        User user = userRepository.findForUpdate(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "User not found!"
                        )
                );

        if (user.isEnabled()) {
            return toResponse(user);
        }
        user.enable();

        User savedUser = userRepository.save(user);
        auditLogRepository.save(new AuditLog(null, currentUser, AuditAction.USER_ENABLED, savedUser));

        return toResponse(savedUser);
    }

    private User getAdminForUpdate(String email) {
        userRepository.findByRoleOrderByIdAsc(UserRole.ADMIN);
        User currentUser = getActiveUser(email);
        if (currentUser.getRole() != UserRole.ADMIN) {
            throw new AccessDeniedException("Only administrators can manage users.");
        }
        return currentUser;
    }

    private void createProfileIfMissing(User user) {
        if (profiles.findByUserId(user.getId()).isEmpty()) {
            profiles.save(new TechnicianProfile(user));
        }
    }

    private void ensureAnotherAdmin(User user) {
        if (user.getRole() == UserRole.ADMIN && user.isEnabled()) {
            int activeAdmins = userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN).size();
            if (activeAdmins <= 1) {
                throw new IllegalStateException("At least one active administrator must remain.");
            }
        }
    }

    private void ensureNoActiveAssignedWork(User user) {
        if (user.getRole() == UserRole.TECHNICIAN) {
            boolean hasActiveIncidents = incidentRepository.existsByAssignedToIdAndLegacyFalseAndStatusIn(
                    user.getId(), List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
            );
            if (hasActiveIncidents || reports.existsByAssignedTechnicianIdAndStatusNot(user.getId(), ReportStatus.CLOSED)) {
                throw new IllegalStateException("This technician still has active assigned work. Reassign reports before changing the role or disabling the account.");
            }
        }
    }

    private UserResponse toResponse(
            User user
    ) {

        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getRole(),
                user.isEnabled(),
                user.getCreatedAt()
        );
    }
}
