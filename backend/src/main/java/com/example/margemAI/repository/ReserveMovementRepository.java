package com.example.margemAI.repository;

import com.example.margemAI.model.ReserveMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ReserveMovementRepository extends JpaRepository<ReserveMovement, UUID> {

    @Query("select m from ReserveMovement m left join fetch m.businessAccount where m.reserve.user.id = :userId order by m.occurredAt desc, m.createdAt desc, m.id desc")
    List<ReserveMovement> findOwned(@Param("userId") UUID userId);
}
