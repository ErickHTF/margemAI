package com.example.margemAI.repository;

import com.example.margemAI.model.DebtInstallment;
import com.example.margemAI.model.InstallmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DebtInstallmentRepository extends JpaRepository<DebtInstallment, UUID> {

    List<DebtInstallment> findByDebtIdOrderByInstallmentNumberAsc(UUID debtId);

    Optional<DebtInstallment> findByIdAndDebtUserId(UUID id, UUID userId);

    @Query("SELECT di FROM DebtInstallment di JOIN di.debt d WHERE d.user.id = :userId " +
           "AND (:status IS NULL OR di.status = :status) " +
           "AND (:startDate IS NULL OR di.dueDate >= :startDate) " +
           "AND (:endDate IS NULL OR di.dueDate <= :endDate) " +
           "ORDER BY di.dueDate ASC, di.installmentNumber ASC")
    List<DebtInstallment> findSchedule(
            @Param("userId") UUID userId,
            @Param("status") InstallmentStatus status,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );
}
