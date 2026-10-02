package com.example.margemAI.controller;

import com.example.margemAI.dto.request.RateioConfigRequest;
import com.example.margemAI.dto.response.FixedCostsSummaryResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.FixedCostProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/settings/operational", "/settings/operational"})
@RequiredArgsConstructor
public class OperationalSettingsController {

    private final FixedCostProfileService fixedCostProfileService;

    @GetMapping("/fixed-costs-summary")
    public ResponseEntity<FixedCostsSummaryResponse> fixedCostsSummary(Authentication authentication) {
        return ResponseEntity.ok(fixedCostProfileService.getSummary(authenticatedUserId(authentication)));
    }

    @PatchMapping("/rateio-config")
    public ResponseEntity<FixedCostsSummaryResponse> updateRateioConfig(
            @Valid @RequestBody RateioConfigRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(fixedCostProfileService.updateConfig(authenticatedUserId(authentication), request));
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
