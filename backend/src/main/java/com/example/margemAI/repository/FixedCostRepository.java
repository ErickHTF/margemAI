package com.example.margemAI.repository;

import com.example.margemAI.model.FixedCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FixedCostRepository extends JpaRepository<FixedCost, UUID>, JpaSpecificationExecutor<FixedCost> {
    Optional<FixedCost> findByIdAndUserIdAndActiveTrue(UUID id, UUID userId);
    Optional<FixedCost> findByIdAndUserId(UUID id, UUID userId);
}
