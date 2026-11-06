package com.linoryx.api.user.dto;

import com.linoryx.api.user.domain.UserRole;

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