package com.example.margemAI.repository;

import com.example.margemAI.model.Segment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SegmentRepository extends JpaRepository<Segment, UUID> {
    Optional<Segment> findByCodeIgnoreCase(String code);
    List<Segment> findByActiveTrueOrderByNameAsc();
    boolean existsByCodeIgnoreCase(String code);
}
