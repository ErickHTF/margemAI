package com.example.margemAI.controller;

import com.example.margemAI.dto.request.GenerateRecurringPayablesRequest;
import com.example.margemAI.dto.request.PayableAccountRequest;
import com.example.margemAI.dto.request.PayablePaymentRequest;
import com.example.margemAI.dto.response.PayableAccountResponse;
import com.example.margemAI.dto.response.PayableSummaryResponse;
import com.example.margemAI.model.PayableStatus;
import com.example.margemAI.model.PayableType;
import com.example.margemAI.model.User;
import com.example.margemAI.service.PayableAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/payables", "/payables"})
@RequiredArgsConstructor
public class PayableAccountController {

    private final PayableAccountService payableAccountService;

    @GetMapping
    public ResponseEntity<PayableSummaryResponse> findAll(
            @RequestParam(required = false) String competency,
            @RequestParam(required = false) PayableStatus status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) PayableType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication authentication
    ) {
        PayableSummaryResponse response = payableAccountService.findAll(
                authenticatedUserId(authentication),
                competency,
                status,
                category,
                type,
                startDate,
                endDate
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PayableAccountResponse> findById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        PayableAccountResponse response = payableAccountService.findById(authenticatedUserId(authentication), id);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<PayableAccountResponse> create(
            @Valid @RequestBody PayableAccountRequest request,
            Authentication authentication
    ) {
        PayableAccountResponse response = payableAccountService.create(authenticatedUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PayableAccountResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody PayableAccountRequest request,
            Authentication authentication
    ) {
        PayableAccountResponse response = payableAccountService.update(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        payableAccountService.delete(authenticatedUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<PayableAccountResponse> pay(
            @PathVariable UUID id,
            @Valid @RequestBody PayablePaymentRequest request,
            Authentication authentication
    ) {
        PayableAccountResponse response = payableAccountService.pay(authenticatedUserId(authentication), id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reverse")
    public ResponseEntity<PayableAccountResponse> reverse(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        PayableAccountResponse response = payableAccountService.reverse(authenticatedUserId(authentication), id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/generate-recurring")
    public ResponseEntity<List<PayableAccountResponse>> generateRecurring(
            @Valid @RequestBody GenerateRecurringPayablesRequest request,
            Authentication authentication
    ) {
        List<PayableAccountResponse> response = payableAccountService.generateRecurring(
                authenticatedUserId(authentication),
                request
        );
        return ResponseEntity.ok(response);
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
