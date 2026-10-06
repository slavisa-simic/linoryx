package com.vigil.api.user.repository;

import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findAllByRoleAndEnabledTrue(
            UserRole role
    );
}
