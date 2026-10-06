package com.vigil.api.user.service;

import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.user.dto.UserResponse;
import com.vigil.api.user.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(
            UserRepository userRepository
    ) {
        this.userRepository = userRepository;
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
