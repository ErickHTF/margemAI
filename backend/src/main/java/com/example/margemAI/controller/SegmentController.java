package com.example.margemAI.controller;

import com.example.margemAI.dto.response.SegmentResponse;
import com.example.margemAI.service.SegmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(path = {"/v1/segments", "/segments"})
@RequiredArgsConstructor
public class SegmentController {

    private final SegmentService segmentService;

    @GetMapping
    public ResponseEntity<List<SegmentResponse>> findAllActive() {
        List<SegmentResponse> segments = segmentService.findAllActive();
        return ResponseEntity.ok(segments);
    }
}
