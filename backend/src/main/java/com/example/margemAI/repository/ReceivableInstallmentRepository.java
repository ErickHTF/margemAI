package com.example.margemAI.repository;

import com.example.margemAI.model.ReceivableInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceivableInstallmentRepository extends JpaRepository<ReceivableInstallment, UUID> {

    @Query("SELECT i FROM ReceivableInstallment i WHERE i.id = :id AND i.receivable.user.id = :userId")
    Optional<ReceivableInstallment> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);

    @Query("SELECT i FROM ReceivableInstallment i WHERE i.receivable.user.id = :userId")
    List<ReceivableInstallment> findByUserId(@Param("userId") UUID userId);
}
