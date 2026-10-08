package com.vigil.api.user.dto;

import com.vigil.api.user.domain.UserRole;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        UserRole role,
        boolean enabled,
        LocalDateTime createdAt
) {
}