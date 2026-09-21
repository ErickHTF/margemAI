package com.example.margemAI.repository;

import com.example.margemAI.model.FixedCostProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface FixedCostProfileRepository extends JpaRepository<FixedCostProfile, UUID> {
    Optional<FixedCostProfile> findByUserId(UUID userId);
}
