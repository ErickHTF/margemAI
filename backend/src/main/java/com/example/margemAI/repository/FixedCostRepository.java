package com.example.margemAI.repository;

import com.example.margemAI.model.FixedCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FixedCostRepository extends JpaRepository<FixedCost, UUID>, JpaSpecificationExecutor<FixedCost> {
    Optional<FixedCost> findByIdAndUserIdAndActiveTrue(UUID id, UUID userId);
    Optional<FixedCost> findByIdAndUserId(UUID id, UUID userId);
    List<FixedCost> findByUserId(UUID userId);

    @Query("select coalesce(sum(f.amount), 0) from FixedCost f where f.user.id = :userId and f.active = true")
    BigDecimal sumActiveAmountByUserId(@Param("userId") UUID userId);
}
