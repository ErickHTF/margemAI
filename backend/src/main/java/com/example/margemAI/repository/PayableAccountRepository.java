package com.example.margemAI.repository;

import com.example.margemAI.model.PayableAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PayableAccountRepository extends JpaRepository<PayableAccount, UUID>, JpaSpecificationExecutor<PayableAccount> {

    Optional<PayableAccount> findByIdAndUserId(UUID id, UUID userId);

    boolean existsByUserIdAndFixedCostIdAndCompetency(UUID userId, UUID fixedCostId, String competency);

    List<PayableAccount> findByUserId(UUID userId);

    List<PayableAccount> findByUserIdAndCompetency(UUID userId, String competency);
}
