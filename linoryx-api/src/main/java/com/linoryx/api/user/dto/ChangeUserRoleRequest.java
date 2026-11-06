package com.linoryx.api.user.dto;

import com.linoryx.api.user.domain.UserRole;
import jakarta.validation.constraints.NotNull;

public record ChangeUserRoleRequest(
        @NotNull UserRole role
) {
}