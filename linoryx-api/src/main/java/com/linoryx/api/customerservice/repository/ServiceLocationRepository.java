package com.linoryx.api.customerservice.repository;

import com.linoryx.api.customerservice.domain.ServiceLocation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServiceLocationRepository extends JpaRepository<ServiceLocation, Long> {
}
