package com.example.margemAI.repository;

import com.example.margemAI.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SaleRepository extends JpaRepository<Sale, UUID>, JpaSpecificationExecutor<Sale> {

    Optional<Sale> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT COALESCE(SUM(s.grossAmount), 0) FROM Sale s WHERE s.user.id = :userId")
    BigDecimal sumGrossAmountByUserId(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(s.grossAmount), 0) FROM Sale s WHERE s.user.id = :userId AND s.createdAt >= :startDate AND s.createdAt <= :endDate")
    BigDecimal sumGrossAmountByUserIdAndPeriod(
            @Param("userId") UUID userId,
            @Param("startDate") java.time.LocalDateTime startDate,
            @Param("endDate") java.time.LocalDateTime endDate
    );

    @Query("SELECT COALESCE(SUM(s.feeAmount), 0) FROM Sale s WHERE s.user.id = :userId")
    BigDecimal sumFeeAmountByUserId(@Param("userId") UUID userId);

    @Query("SELECT COALESCE(SUM(s.netAmount), 0) FROM Sale s WHERE s.user.id = :userId")
    BigDecimal sumNetAmountByUserId(@Param("userId") UUID userId);
}
