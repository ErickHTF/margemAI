package com.example.margemAI.service;

import com.example.margemAI.dto.response.SegmentResponse;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Segment;
import com.example.margemAI.repository.SegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SegmentService {

    private final SegmentRepository segmentRepository;

    @Transactional(readOnly = true)
    public List<SegmentResponse> findAllActive() {
        return segmentRepository.findByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Segment findByCode(String code) {
        return segmentRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Segmento '" + code + "' não encontrado ou inativo."));
    }

    private SegmentResponse toResponse(Segment segment) {
        return SegmentResponse.builder()
                .id(segment.getId())
                .code(segment.getCode())
                .name(segment.getName())
                .description(segment.getDescription())
                .build();
    }
}
