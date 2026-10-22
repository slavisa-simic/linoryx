package com.vigil.api.user.service;

import com.vigil.api.exception.ResourceNotFoundException;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.audit.domain.AuditAction;
import com.vigil.api.audit.domain.AuditLog;
import com.vigil.api.audit.repository.AuditLogRepository;
import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.incident.domain.IncidentStatus;
import com.vigil.api.incident.repository.IncidentRepository;
import com.vigil.api.user.dto.UserResponse;
import com.vigil.api.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final IncidentRepository incidentRepository;

    public UserService(
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            IncidentRepository incidentRepository
    ) {
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.incidentRepository = incidentRepository;
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

    @Transactional
    public UserResponse changeUserRole(
            String currentUserEmail,
            Long userId,
            UserRole role
    ) {
        User currentUser = getAdminForUpdate(currentUserEmail);
        User user = userRepository.findById(userId)
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
            return toResponse(user);
        }
        ensureAnotherAdmin(user);
        ensureNoActiveAssignedIncidents(user);

        UserRole previousRole = user.getRole();
        user.changeRole(role);

        User savedUser = userRepository.save(user);
        auditLogRepository.save(new AuditLog(currentUser, savedUser, previousRole, role));

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse disableUser(String currentUserEmail, Long userId){
        User currentUser = getAdminForUpdate(currentUserEmail);
        User user = userRepository
                .findById(userId)
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
        ensureNoActiveAssignedIncidents(user);
        user.disable();

        User savedUser = userRepository.save(user);
        auditLogRepository.save(new AuditLog(null, currentUser, AuditAction.USER_DISABLED, savedUser));

        return toResponse(savedUser);
    }

    @Transactional
    public UserResponse enableUser(String currentUserEmail, Long userId) {
        User currentUser = getAdminForUpdate(currentUserEmail);
        User user = userRepository.findById(userId)
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

    private void ensureAnotherAdmin(User user) {
        if (user.getRole() == UserRole.ADMIN && user.isEnabled()) {
            int activeAdmins = userRepository.findAllByRoleAndEnabledTrue(UserRole.ADMIN).size();
            if (activeAdmins <= 1) {
                throw new IllegalStateException("At least one active administrator must remain.");
            }
        }
    }

    private void ensureNoActiveAssignedIncidents(User user) {
        if (user.getRole() == UserRole.TECHNICIAN) {
            boolean hasActiveIncidents = incidentRepository.existsByAssignedToIdAndStatusIn(
                    user.getId(), List.of(IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS)
            );
            if (hasActiveIncidents) {
                throw new IllegalStateException("This technician still has active assigned incidents. Reassign them before changing the role or disabling the account.");
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
