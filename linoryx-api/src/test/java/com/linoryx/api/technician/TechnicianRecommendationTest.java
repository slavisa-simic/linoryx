package com.linoryx.api.technician;

import com.linoryx.api.customerservice.domain.*;
import com.linoryx.api.location.domain.LocationData;
import com.linoryx.api.report.domain.*;
import com.linoryx.api.report.repository.CustomerReportRepository;
import com.linoryx.api.technician.domain.*;
import com.linoryx.api.technician.dto.*;
import com.linoryx.api.technician.service.*;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TechnicianRecommendationTest {
    @Mock TechnicianOverviewService overview;
    @Mock CustomerReportRepository reports;
    @InjectMocks TechnicianRecommendationService recommendations;

    @Test
    void specializationMappingIsExplicitAndRoutingOnlyAppliesToRelevantCategories() {
        assertEquals(2, TechnicianRecommendationService.matchQuality(ServiceType.FIBER, ReportCategory.NO_INTERNET, Set.of(TechnicianSpecialization.GPON)));
        assertEquals(2, TechnicianRecommendationService.matchQuality(ServiceType.DSL, ReportCategory.NO_INTERNET, Set.of(TechnicianSpecialization.DSL)));
        assertEquals(2, TechnicianRecommendationService.matchQuality(ServiceType.WIRELESS, ReportCategory.NO_INTERNET, Set.of(TechnicianSpecialization.WIRELESS)));
        assertEquals(0, TechnicianRecommendationService.matchQuality(ServiceType.FIBER, ReportCategory.NO_INTERNET, Set.of(TechnicianSpecialization.ROUTING)));
        assertEquals(1, TechnicianRecommendationService.matchQuality(ServiceType.FIBER, ReportCategory.HIGH_LATENCY, Set.of(TechnicianSpecialization.ROUTING)));
        assertEquals(3, TechnicianRecommendationService.matchQuality(ServiceType.FIBER, ReportCategory.UNSTABLE_CONNECTION, Set.of(TechnicianSpecialization.ROUTING, TechnicianSpecialization.FIBER)));
        assertEquals(0, TechnicianRecommendationService.matchQuality(ServiceType.FIBER, ReportCategory.OTHER, Set.of()));
    }

    @Test
    void haversineHandlesKnownDistanceZeroAndOppositePoints() {
        assertEquals(111.195, TechnicianRecommendationService.distanceKm(0, 0, 0, 1), 0.01);
        assertEquals(0, TechnicianRecommendationService.distanceKm(45, 19, 45, 19));
        assertEquals(20015.087, TechnicianRecommendationService.distanceKm(0, 0, 0, 180), 0.01);
    }

    private TechnicianProfileResponse technician(long id, long workload, double latitude, Set<TechnicianSpecialization> skills,
                                                TechnicianAvailability availability) {
        return new TechnicianProfileResponse(id, "Tech " + id, BigDecimal.valueOf(latitude), BigDecimal.ZERO, availability, skills, null, workload);
    }

    @Test
    void rankingUsesEligibilityThenMatchQualityWorkloadDistanceAndStableId() {
        CustomerService service = mock(CustomerService.class);
        when(service.getServiceType()).thenReturn(ServiceType.FIBER);
        when(service.getServiceLocation()).thenReturn(new ServiceLocation(new LocationData("Installation", "City", "RS", BigDecimal.ZERO, BigDecimal.ZERO)));
        CustomerReport report = new CustomerReport(service, ReportCategory.HIGH_LATENCY, "Slow");
        when(reports.findForRecommendation(1L)).thenReturn(Optional.of(report));
        Set<TechnicianSpecialization> fiber = Set.of(TechnicianSpecialization.FIBER);
        when(overview.list("dispatcher")).thenReturn(List.of(
                technician(9, 0, 0, fiber, TechnicianAvailability.BUSY),
                technician(8, 0, 0, fiber, TechnicianAvailability.OFF_DUTY),
                technician(7, 0, 0, fiber, null),
                technician(6, 0, 0, Set.of(), TechnicianAvailability.AVAILABLE),
                technician(5, 1, 0, fiber, TechnicianAvailability.AVAILABLE),
                technician(4, 0, 1, fiber, TechnicianAvailability.AVAILABLE),
                technician(3, 0, 0, fiber, TechnicianAvailability.AVAILABLE),
                technician(2, 0, 0, fiber, TechnicianAvailability.AVAILABLE),
                technician(1, 10, 50, Set.of(TechnicianSpecialization.FIBER, TechnicianSpecialization.ROUTING), TechnicianAvailability.AVAILABLE)));
        var candidates = recommendations.recommend(1L, "dispatcher");
        assertEquals(List.of(1L, 2L, 3L, 4L, 5L), candidates.stream().filter(TechnicianRecommendation::recommended).map(item -> item.technician().userId()).toList());
        assertEquals(5, candidates.stream().filter(TechnicianRecommendation::recommended).count());
        assertTrue(candidates.stream().filter(item -> item.technician().userId() >= 7).noneMatch(TechnicianRecommendation::assignable));
        assertTrue(candidates.stream().anyMatch(item -> item.technician().userId() == 6 && item.assignable() && !item.recommended()));
    }
}
