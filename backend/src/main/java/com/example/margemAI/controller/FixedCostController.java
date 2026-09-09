package com.example.margemAI.controller;

import com.example.margemAI.dto.request.FixedCostRequest;
import com.example.margemAI.dto.response.FixedCostResponse;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.User;
import com.example.margemAI.service.FixedCostService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/costs/fixed", "/costs/fixed"})
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class FixedCostController {

    private final FixedCostService fixedCostService;

    @GetMapping
    public ResponseEntity<PaginatedResponse<FixedCostResponse>> findAll(
            @RequestParam(required = false) String month,
            @RequestParam(required = false) FixedCostCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        PaginatedResponse<FixedCostResponse> costs = fixedCostService.findAll(
                authenticatedUserId(authentication), month, category, page, size);
        return ResponseEntity.ok(costs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<FixedCostResponse> findById(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(fixedCostService.findById(authenticatedUserId(authentication), id));
    }

    @PostMapping
    public ResponseEntity<FixedCostResponse> create(
            @Valid @RequestBody FixedCostRequest request,
            Authentication authentication) {
        FixedCostResponse created = fixedCostService.create(authenticatedUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FixedCostResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody FixedCostRequest request,
            Authentication authentication) {
        FixedCostResponse updated = fixedCostService.update(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<FixedCostResponse> patch(
            @PathVariable UUID id,
            @Valid @RequestBody FixedCostRequest request,
            Authentication authentication) {
        FixedCostResponse patched = fixedCostService.patch(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(patched);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        fixedCostService.delete(authenticatedUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
