package com.vigil.api.network.repository;

import com.vigil.api.network.domain.NetworkNode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NetworkNodeRepository extends JpaRepository<NetworkNode, Long> {
}
