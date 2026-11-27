package com.example.margemAI.controller;

import com.example.margemAI.dto.response.SegmentGuidanceResponse;
import com.example.margemAI.dto.response.SegmentResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.SegmentGuidanceService;
import com.example.margemAI.service.SegmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/segments", "/segments"})
@RequiredArgsConstructor
public class SegmentController {

    private final SegmentService segmentService;
    private final SegmentGuidanceService segmentGuidanceService;

    @GetMapping
    public ResponseEntity<List<SegmentResponse>> findAllActive() {
        List<SegmentResponse> segments = segmentService.findAllActive();
        return ResponseEntity.ok(segments);
    }

    @GetMapping("/guidance")
    public ResponseEntity<SegmentGuidanceResponse> getGuidance(
            @RequestParam(required = false) UUID segmentId,
            @RequestParam(required = false) String segmentName,
            Authentication authentication) {
        UUID userId = (authentication != null && authentication.getPrincipal() instanceof User user)
                ? user.getId()
                : null;
        return ResponseEntity.ok(segmentGuidanceService.getGuidance(userId, segmentId, segmentName));
    }
}
