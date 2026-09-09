package com.example.margemAI.controller;

import com.example.margemAI.dto.request.VariableCostRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.VariableCostResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.service.VariableCostService;
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
@RequestMapping(path = {"/v1/costs/variable", "/costs/variable"})
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class VariableCostController {

    private final VariableCostService variableCostService;

    @GetMapping
    public ResponseEntity<PaginatedResponse<VariableCostResponse>> findAll(
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) VariableCostCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        PaginatedResponse<VariableCostResponse> costs = variableCostService.findAll(
                authenticatedUserId(authentication), productId, category, page, size);
        return ResponseEntity.ok(costs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<VariableCostResponse> findById(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(variableCostService.findById(authenticatedUserId(authentication), id));
    }

    @PostMapping
    public ResponseEntity<VariableCostResponse> create(
            @Valid @RequestBody VariableCostRequest request,
            Authentication authentication) {
        VariableCostResponse created = variableCostService.create(authenticatedUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<VariableCostResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody VariableCostRequest request,
            Authentication authentication) {
        VariableCostResponse updated = variableCostService.update(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<VariableCostResponse> patch(
            @PathVariable UUID id,
            @Valid @RequestBody VariableCostRequest request,
            Authentication authentication) {
        VariableCostResponse patched = variableCostService.patch(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(patched);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        variableCostService.delete(authenticatedUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
