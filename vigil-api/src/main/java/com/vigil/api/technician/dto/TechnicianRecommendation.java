package com.vigil.api.technician.dto;

import java.util.List;

public record TechnicianRecommendation(TechnicianProfileResponse technician, boolean recommended,
        boolean assignable, int matchQuality, Double distanceKm, List<String> warnings) { }
