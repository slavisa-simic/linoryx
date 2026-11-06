package com.linoryx.api.user.repository;

import com.linoryx.api.user.domain.User;
import com.linoryx.api.user.domain.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from User user where user.email = :email")
    Optional<User> findByEmailForUpdate(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select user from User user where user.id = :id")
    Optional<User> findForUpdate(Long id);

    boolean existsByEmail(String email);

    // Promjene admina se obavljaju redom, da uvijek ostane aktivan admin.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<User> findByRoleOrderByIdAsc(UserRole role);

    List<User> findAllByRoleAndEnabledTrue(
            UserRole role
    );
}
