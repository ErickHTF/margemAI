package com.example.margemAI.controller;

import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/alerts", "/alerts"})
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @GetMapping("/mei-cap")
    public ResponseEntity<MeiCapResponse> getMeiCapStatus(
            @RequestParam(required = false) BigDecimal accumulatedRevenue,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        MeiCapResponse response = alertService.getMeiCapStatus(userId, accumulatedRevenue);
        return ResponseEntity.ok(response);
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
