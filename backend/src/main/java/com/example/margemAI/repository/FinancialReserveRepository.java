package com.example.margemAI.repository;

import com.example.margemAI.model.FinancialReserve;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FinancialReserveRepository extends JpaRepository<FinancialReserve, UUID> {
    Optional<FinancialReserve> findByUserId(UUID userId);
}
