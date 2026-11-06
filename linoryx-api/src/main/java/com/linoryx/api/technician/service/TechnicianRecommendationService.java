package com.linoryx.api.technician.service;

import com.linoryx.api.customerservice.domain.*;
import com.linoryx.api.exception.ResourceNotFoundException;
import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.technician.domain.*;
import com.linoryx.api.technician.dto.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TechnicianRecommendationService {
    private final TechnicianOverviewService overview;
    private final CustomerReportRepository reports;

    public TechnicianRecommendationService(TechnicianOverviewService overview, CustomerReportRepository reports) {
        this.overview = overview;
        this.reports = reports;
    }

    @Transactional(readOnly = true)
    public List<TechnicianRecommendation> recommend(Long reportId, String email) {
        // Check access before looking up the report.
        List<TechnicianProfileResponse> technicians = overview.list(email);
        CustomerReport report = reports.findForRecommendation(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found."));
        ServiceLocation location = report.getCustomerService().getServiceLocation();
        List<TechnicianRecommendation> result = new ArrayList<>();
        for (TechnicianProfileResponse technician : technicians) {
            int quality = matchQuality(report.getCustomerService().getServiceType(), report.getCategory(), technician.specializations());
            boolean assignable = technician.availability() == TechnicianAvailability.AVAILABLE;
            boolean hasLocation = validCoordinates(technician.latitude(), technician.longitude());
            Double distance = null;
            List<String> warnings = new ArrayList<>();
            if (!assignable) warnings.add("Availability must be AVAILABLE before assignment.");
            if (quality == 0) warnings.add("No matching specialization.");
            if (!hasLocation) warnings.add("Technician location not set.");
            if (hasLocation && validCoordinates(location.getLatitude(), location.getLongitude())) {
                distance = distanceKm(technician.latitude().doubleValue(), technician.longitude().doubleValue(),
                        location.getLatitude().doubleValue(), location.getLongitude().doubleValue());
            } else if (!validCoordinates(location.getLatitude(), location.getLongitude())) {
                warnings.add("Service location coordinates unavailable.");
            }
            result.add(new TechnicianRecommendation(technician, assignable && quality > 0 && hasLocation,
                    assignable, quality, distance, warnings));
        }
        result.sort(this::compare);
        return result;
    }

    private int compare(TechnicianRecommendation first, TechnicianRecommendation second) {
        if (first.recommended() != second.recommended()) return first.recommended() ? -1 : 1;
        if (first.matchQuality() != second.matchQuality()) return Integer.compare(second.matchQuality(), first.matchQuality());
        int workloadOrder = Long.compare(first.technician().activeReportCount(), second.technician().activeReportCount());
        if (workloadOrder != 0) return workloadOrder;
        double firstDistance = Double.POSITIVE_INFINITY;
        double secondDistance = Double.POSITIVE_INFINITY;
        if (first.distanceKm() != null) firstDistance = first.distanceKm();
        if (second.distanceKm() != null) secondDistance = second.distanceKm();
        int distanceOrder = Double.compare(firstDistance, secondDistance);
        if (distanceOrder != 0) return distanceOrder;
        return first.technician().userId().compareTo(second.technician().userId());
    }

    public static int matchQuality(ServiceType type, ReportCategory category, Set<TechnicianSpecialization> skills) {
        boolean technologyMatch = false;
        if (type == ServiceType.FIBER) {
            technologyMatch = skills.contains(TechnicianSpecialization.FIBER) || skills.contains(TechnicianSpecialization.GPON);
        } else if (type == ServiceType.DSL) {
            technologyMatch = skills.contains(TechnicianSpecialization.DSL);
        } else if (type == ServiceType.WIRELESS) {
            technologyMatch = skills.contains(TechnicianSpecialization.WIRELESS);
        }
        boolean routingRelevant = category == ReportCategory.HIGH_LATENCY || category == ReportCategory.UNSTABLE_CONNECTION;
        int quality = 0;
        if (technologyMatch) quality = 2;
        if (routingRelevant && skills.contains(TechnicianSpecialization.ROUTING)) quality += 1;
        return quality;
    }

    public static boolean validCoordinates(BigDecimal latitude, BigDecimal longitude) {
        return latitude != null && longitude != null && latitude.abs().compareTo(BigDecimal.valueOf(90)) <= 0
                && longitude.abs().compareTo(BigDecimal.valueOf(180)) <= 0;
    }

    public static double distanceKm(double latitude, double longitude, double otherLatitude, double otherLongitude) {
        double latitudeDifference = Math.toRadians(otherLatitude - latitude);
        double longitudeDifference = Math.toRadians(otherLongitude - longitude);
        double a = Math.pow(Math.sin(latitudeDifference / 2), 2)
                + Math.cos(Math.toRadians(latitude)) * Math.cos(Math.toRadians(otherLatitude))
                * Math.pow(Math.sin(longitudeDifference / 2), 2);
        // Clamp rounding errors at opposite points on Earth.
        return 6371.0 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    }
}
