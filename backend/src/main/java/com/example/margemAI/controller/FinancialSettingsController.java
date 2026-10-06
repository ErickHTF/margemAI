package com.example.margemAI.controller;

import com.example.margemAI.dto.request.PaymentMethodConfigRequest;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.PaymentMethodConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/settings/financial/payment-methods", "/settings/financial/payment-methods"})
@RequiredArgsConstructor
public class FinancialSettingsController {

    private final PaymentMethodConfigService configService;

    @GetMapping
    public ResponseEntity<List<PaymentMethodConfigResponse>> getPaymentMethods(Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        return ResponseEntity.ok(configService.getMatrixForUser(userId));
    }

    @PutMapping
    public ResponseEntity<List<PaymentMethodConfigResponse>> updatePaymentMethods(
            @Valid @RequestBody List<PaymentMethodConfigRequest> requests,
            Authentication authentication
    ) {
        UUID userId = authenticatedUserId(authentication);
        return ResponseEntity.ok(configService.updateMatrix(userId, requests));
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
