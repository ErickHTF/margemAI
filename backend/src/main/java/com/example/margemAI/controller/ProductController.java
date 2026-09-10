package com.example.margemAI.controller;

import com.example.margemAI.dto.request.ProductRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.ProductResponse;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.User;
import com.example.margemAI.service.ProductService;
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

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/products", "/products"})
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<PaginatedResponse<ProductResponse>> findAll(
            @RequestParam(required = false) ItemType type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {
        PaginatedResponse<ProductResponse> products = productService.findAll(
                authenticatedUserId(authentication), type, search, active, page, size);
        return ResponseEntity.ok(products);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> findById(@PathVariable UUID id, Authentication authentication) {
        return ResponseEntity.ok(productService.findById(authenticatedUserId(authentication), id));
    }

    @PostMapping
    public ResponseEntity<ProductResponse> create(
            @Valid @RequestBody ProductRequest request,
            Authentication authentication) {
        ProductResponse created = productService.create(authenticatedUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody ProductRequest request,
            Authentication authentication) {
        ProductResponse updated = productService.update(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ProductResponse> patch(
            @PathVariable UUID id,
            @RequestBody ProductRequest request,
            Authentication authentication) {
        ProductResponse patched = productService.patch(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(patched);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, Authentication authentication) {
        productService.delete(authenticatedUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
