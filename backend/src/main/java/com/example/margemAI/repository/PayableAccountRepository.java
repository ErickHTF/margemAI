package com.example.margemAI.repository;

import com.example.margemAI.model.PayableAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayableAccountRepository extends JpaRepository<PayableAccount, UUID>, JpaSpecificationExecutor<PayableAccount> {

    Optional<PayableAccount> findByIdAndUserId(UUID id, UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from PayableAccount p where p.id = :id and p.user.id = :userId")
    Optional<PayableAccount> findByIdAndUserIdForUpdate(@Param("id") UUID id, @Param("userId") UUID userId);

    boolean existsByUserIdAndFixedCostIdAndCompetency(UUID userId, UUID fixedCostId, String competency);

    boolean existsByUserIdAndFixedCostIdAndCompetencyAndIdNot(UUID userId, UUID fixedCostId, String competency, UUID id);

    List<PayableAccount> findByUserId(UUID userId);

    List<PayableAccount> findByUserIdAndCompetency(UUID userId, String competency);
}
