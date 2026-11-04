package com.vigil.api.customerservice.repository;

import com.vigil.api.customerservice.domain.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerServiceRepository extends JpaRepository<CustomerService, Long> {
    boolean existsByNetworkNodeId(Long nodeId);
    long countByNetworkNodeId(Long nodeId);
    boolean existsByCustomerIdAndStatusNot(Long customerId, ServiceStatus status);

    @EntityGraph(attributePaths = {"serviceLocation", "networkNode"})
    Page<CustomerService> findByCustomerId(Long customerId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"serviceLocation", "networkNode"})
    Page<CustomerService> findAll(Pageable pageable);
}
