package com.example.margemAI.controller;

import com.example.margemAI.dto.request.CategoryRequest;
import com.example.margemAI.dto.request.CategoryStatusRequest;
import com.example.margemAI.dto.response.CategoryResponse;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.User;
import com.example.margemAI.service.CategoryRevalidationService;
import com.example.margemAI.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/categories", "/categories"})
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final CategoryRevalidationService categoryRevalidationService;

    @GetMapping
    public ResponseEntity<PaginatedResponse<CategoryResponse>> findAll(
            @RequestParam(required = false) ItemType type,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        PaginatedResponse<CategoryResponse> categories = categoryService.findAll(
                authenticatedUserId(authentication), type, active, search, page, size);
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponse> findById(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(categoryService.findById(authenticatedUserId(authentication), id));
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(
            @Valid @RequestBody CategoryRequest request,
            Authentication authentication) {
        CategoryResponse created = categoryService.create(authenticatedUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryRequest request,
            Authentication authentication) {
        CategoryResponse updated = categoryService.update(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<CategoryResponse> patchStatus(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryStatusRequest request,
            Authentication authentication) {
        CategoryResponse updated = categoryService.patchStatus(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        categoryService.delete(authenticatedUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/revalidate-prices")
    public ResponseEntity<Map<String, Object>> revalidatePrices(
            @PathVariable UUID id,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        int updated = categoryRevalidationService.revalidatePrices(userId, id);
        return ResponseEntity.ok(Map.of("categoryId", id, "updatedProducts", updated));
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
