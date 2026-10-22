package com.example.margemAI.repository;

import com.example.margemAI.model.Receivable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReceivableRepository extends JpaRepository<Receivable, UUID>, JpaSpecificationExecutor<Receivable> {

    Optional<Receivable> findByIdAndUserId(UUID id, UUID userId);

    Optional<Receivable> findBySaleIdAndUserId(UUID saleId, UUID userId);

    List<Receivable> findByUserId(UUID userId);

    void deleteBySaleIdAndUserId(UUID saleId, UUID userId);
}
