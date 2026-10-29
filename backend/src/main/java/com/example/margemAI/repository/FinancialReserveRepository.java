package com.example.margemAI.repository;

import com.example.margemAI.model.FinancialReserve;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface FinancialReserveRepository extends JpaRepository<FinancialReserve, UUID> {
    Optional<FinancialReserve> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from FinancialReserve r where r.user.id = :userId")
    Optional<FinancialReserve> findByUserIdForUpdate(@Param("userId") UUID userId);
}
