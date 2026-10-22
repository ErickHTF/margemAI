package com.example.margemAI.controller;

import com.example.margemAI.dto.request.ReceivableRequest;
import com.example.margemAI.dto.request.ReverseInstallmentRequest;
import com.example.margemAI.dto.request.SettleInstallmentRequest;
import com.example.margemAI.dto.response.ReceivableInstallmentResponse;
import com.example.margemAI.dto.response.ReceivableResponse;
import com.example.margemAI.dto.response.ReceivableSummaryResponse;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.User;
import com.example.margemAI.service.ReceivableService;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/receivables", "/receivables"})
@RequiredArgsConstructor
public class ReceivableController {

    private final ReceivableService receivableService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ReceivableResponse> create(
            @Valid @RequestBody ReceivableRequest request,
            Authentication authentication
    ) {
        ReceivableResponse response = receivableService.create(authenticatedUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<ReceivableSummaryResponse> findAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) PaymentMethod paymentMethod,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        ReceivableSummaryResponse response = receivableService.findAll(
                authenticatedUserId(authentication),
                status,
                paymentMethod,
                startDate,
                endDate,
                search,
                page,
                size
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReceivableResponse> findById(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        ReceivableResponse response = receivableService.findById(authenticatedUserId(authentication), id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        receivableService.delete(authenticatedUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/installments/{id}/settle")
    public ResponseEntity<ReceivableInstallmentResponse> settle(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) SettleInstallmentRequest request,
            Authentication authentication
    ) {
        ReceivableInstallmentResponse response = receivableService.settle(
                authenticatedUserId(authentication),
                id,
                request
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/installments/{id}/reverse")
    public ResponseEntity<ReceivableInstallmentResponse> reverse(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) ReverseInstallmentRequest request,
            Authentication authentication
    ) {
        ReceivableInstallmentResponse response = receivableService.reverse(
                authenticatedUserId(authentication),
                id,
                request
        );
        return ResponseEntity.ok(response);
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
