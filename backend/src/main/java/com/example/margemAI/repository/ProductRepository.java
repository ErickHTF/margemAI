package com.example.margemAI.repository;

import com.example.margemAI.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {
    Optional<Product> findByIdAndUserIdAndActiveTrue(UUID id, UUID userId);
    Optional<Product> findByIdAndUserId(UUID id, UUID userId);
    List<Product> findByActiveTrueAndIdInAndUserId(Collection<UUID> ids, UUID userId);
}
