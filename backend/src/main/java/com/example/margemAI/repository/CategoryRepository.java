package com.example.margemAI.repository;

import com.example.margemAI.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID>, JpaSpecificationExecutor<Category> {
    Optional<Category> findByIdAndUserIdAndActiveTrue(UUID id, UUID userId);
    Optional<Category> findByIdAndUserId(UUID id, UUID userId);
    Optional<Category> findByUserIdAndSlug(UUID userId, String slug);
    boolean existsByUserIdAndSlug(UUID userId, String slug);
    boolean existsByParentIdAndUserIdAndActiveTrue(UUID parentId, UUID userId);
}
