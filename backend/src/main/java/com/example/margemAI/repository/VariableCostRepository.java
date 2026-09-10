package com.example.margemAI.repository;

import com.example.margemAI.model.VariableCost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VariableCostRepository extends JpaRepository<VariableCost, UUID>, JpaSpecificationExecutor<VariableCost> {
    Optional<VariableCost> findByIdAndUserIdAndActiveTrue(UUID id, UUID userId);
    Optional<VariableCost> findByIdAndUserId(UUID id, UUID userId);
    List<VariableCost> findByProductIdAndUserIdAndActiveTrue(UUID productId, UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE VariableCost vc
            SET vc.productId = null
            WHERE vc.user.id = :userId AND vc.productId = :productId AND vc.active = true
            """)
    int clearProductLink(@Param("userId") UUID userId, @Param("productId") UUID productId);
}
