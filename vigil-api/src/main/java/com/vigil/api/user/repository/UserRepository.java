package com.vigil.api.user.repository;

import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    // Promjene admina se obavljaju redom, da uvijek ostane aktivan admin.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<User> findByRoleOrderByIdAsc(UserRole role);

    List<User> findAllByRoleAndEnabledTrue(
            UserRole role
    );
}
