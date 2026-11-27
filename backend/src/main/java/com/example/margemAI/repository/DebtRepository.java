package com.example.margemAI.repository;

import com.example.margemAI.model.Debt;
import com.example.margemAI.model.DebtStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DebtRepository extends JpaRepository<Debt, UUID> {
    List<Debt> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Debt> findByUserIdAndStatusOrderByCreatedAtDesc(UUID userId, DebtStatus status);
    Optional<Debt> findByIdAndUserId(UUID id, UUID userId);
}
