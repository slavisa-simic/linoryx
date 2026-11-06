package com.linoryx.api.technician.repository;

import com.linoryx.api.technician.domain.TechnicianProfile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;

public interface TechnicianProfileRepository extends JpaRepository<TechnicianProfile, Long> {
    @EntityGraph(attributePaths = "specializations")
    Optional<TechnicianProfile> findByUserId(Long userId);

    @Query("""
            select distinct profile from TechnicianProfile profile
            join fetch profile.user user left join fetch profile.specializations
            where user.role = com.linoryx.api.user.domain.UserRole.TECHNICIAN and user.enabled = true
            """)
    List<TechnicianProfile> findActiveTechnicianProfiles();
}
