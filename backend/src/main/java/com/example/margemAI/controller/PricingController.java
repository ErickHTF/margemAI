package com.example.margemAI.controller;

import com.example.margemAI.dto.request.BreakEvenRequest;
import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.BreakEvenResponse;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.PricingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/pricing", "/pricing"})
@RequiredArgsConstructor
public class PricingController {

    private final PricingService pricingService;

    @PostMapping("/calculate")
    public ResponseEntity<PricingResponse> calculatePricing(
            @Valid @RequestBody PricingRequest request,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        PricingResponse response = pricingService.calculatePricing(request, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/simulate-discount")
    public ResponseEntity<SimulateDiscountResponse> simulateDiscount(@Valid @RequestBody SimulateDiscountRequest request) {
        SimulateDiscountResponse response = pricingService.simulateDiscount(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/break-even")
    public ResponseEntity<BreakEvenResponse> calculateBreakEven(
            @Valid @RequestBody BreakEvenRequest request,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        BreakEvenResponse response = pricingService.calculateBreakEven(request, userId);
        return ResponseEntity.ok(response);
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
