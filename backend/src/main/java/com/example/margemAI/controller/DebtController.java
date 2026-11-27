package com.example.margemAI.controller;

import com.example.margemAI.dto.request.DebtRequest;
import com.example.margemAI.dto.request.DebtSimulatePayoffRequest;
import com.example.margemAI.dto.request.PayInstallmentRequest;
import com.example.margemAI.dto.response.DebtInstallmentResponse;
import com.example.margemAI.dto.response.DebtPayoffSimulationResponse;
import com.example.margemAI.dto.response.DebtResponse;
import com.example.margemAI.dto.response.DebtSummaryResponse;
import com.example.margemAI.model.InstallmentStatus;
import com.example.margemAI.model.User;
import com.example.margemAI.service.DebtService;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/debts", "/debts"})
@RequiredArgsConstructor
public class DebtController {

    private final DebtService debtService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DebtResponse create(Authentication auth, @Valid @RequestBody DebtRequest request) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.create(userId, request);
    }

    @GetMapping
    public List<DebtResponse> list(Authentication auth) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.list(userId);
    }

    @GetMapping("/summary")
    public DebtSummaryResponse getSummary(Authentication auth) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.getSummary(userId);
    }

    @GetMapping("/schedule")
    public List<DebtInstallmentResponse> getSchedule(
            Authentication auth,
            @RequestParam(required = false) InstallmentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.getSchedule(userId, status, startDate, endDate);
    }

    @GetMapping("/{id}")
    public DebtResponse get(Authentication auth, @PathVariable UUID id) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.get(userId, id);
    }

    @PutMapping("/{id}")
    public DebtResponse update(Authentication auth, @PathVariable UUID id, @Valid @RequestBody DebtRequest request) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable UUID id) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        debtService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/simulate-payoff")
    public DebtPayoffSimulationResponse simulatePayoff(
            Authentication auth,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) DebtSimulatePayoffRequest request
    ) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.simulatePayoff(userId, id, request);
    }

    @PostMapping("/installments/{installmentId}/pay")
    public DebtInstallmentResponse payInstallment(
            Authentication auth,
            @PathVariable UUID installmentId,
            @Valid @RequestBody(required = false) PayInstallmentRequest request
    ) {
        UUID userId = ((User) auth.getPrincipal()).getId();
        return debtService.payInstallment(userId, installmentId, request);
    }
}
