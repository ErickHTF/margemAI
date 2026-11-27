package com.example.margemAI.repository;

import com.example.margemAI.model.MeiObligation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MeiObligationRepository extends JpaRepository<MeiObligation, UUID> {

    List<MeiObligation> findByUserIdAndReferenceYearOrderByDueDateAsc(UUID userId, Integer referenceYear);

    List<MeiObligation> findByUserId(UUID userId);

    Optional<MeiObligation> findByIdAndUserId(UUID id, UUID userId);

    Optional<MeiObligation> findFirstByUserIdOrderByUpdatedAtDesc(UUID userId);
}
