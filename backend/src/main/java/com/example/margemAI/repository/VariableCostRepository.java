package com.example.margemAI.repository;

import com.example.margemAI.model.VariableCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VariableCostRepository extends JpaRepository<VariableCost, UUID>, JpaSpecificationExecutor<VariableCost> {
    Optional<VariableCost> findByIdAndUserIdAndActiveTrue(UUID id, UUID userId);
    Optional<VariableCost> findByIdAndUserId(UUID id, UUID userId);
}
