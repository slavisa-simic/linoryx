package com.linoryx.api.technician.service;

import com.linoryx.api.technician.domain.TechnicianProfile;
import com.linoryx.api.technician.dto.TechnicianProfileResponse;
import com.linoryx.api.user.domain.User;
import java.util.Set;

final class TechnicianProfileMapper {
    private TechnicianProfileMapper() { }

    static TechnicianProfileResponse toResponse(User user, TechnicianProfile profile, long workload) {
        String name = user.getFirstName() + " " + user.getLastName();
        if (profile == null) {
            return new TechnicianProfileResponse(user.getId(), name, null, null, null, Set.of(), null, workload);
        }
        return new TechnicianProfileResponse(user.getId(), name, profile.getLatitude(), profile.getLongitude(),
                profile.getAvailability(), profile.getSpecializations(), profile.getLocationUpdatedAt(), workload);
    }
}
