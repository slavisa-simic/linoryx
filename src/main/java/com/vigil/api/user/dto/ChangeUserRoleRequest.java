package com.vigil.api.user.dto;

import com.vigil.api.user.domain.UserRole;
import jakarta.validation.constraints.NotNull;

public record ChangeUserRoleRequest(
        @NotNull UserRole role
) {
}