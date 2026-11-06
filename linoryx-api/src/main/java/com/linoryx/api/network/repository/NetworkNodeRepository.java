package com.linoryx.api.network.repository;

import com.linoryx.api.network.domain.NetworkNode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkNodeRepository extends JpaRepository<NetworkNode, Long> {
}
