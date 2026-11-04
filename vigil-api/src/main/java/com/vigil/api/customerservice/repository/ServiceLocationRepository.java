package com.vigil.api.customerservice.repository;

import com.vigil.api.customerservice.domain.ServiceLocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceLocationRepository extends JpaRepository<ServiceLocation, Long> {
}
