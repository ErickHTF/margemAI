package com.example.margemAI.controller;

import com.example.margemAI.dto.request.ReserveGoalRequest;
import com.example.margemAI.dto.request.ReserveMovementRequest;
import com.example.margemAI.dto.response.FinancialReserveResponse;
import com.example.margemAI.dto.response.ReserveMovementResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.FinancialReserveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping({"/reserves", "/v1/reserves"})
public class FinancialReserveController {

    private final FinancialReserveService service;

    @GetMapping
    public FinancialReserveResponse getSummary(Authentication auth) {
        return service.getSummary(((User) auth.getPrincipal()).getId());
    }

    @PutMapping("/goal")
    public FinancialReserveResponse updateGoal(Authentication auth, @Valid @RequestBody ReserveGoalRequest request) {
        return service.updateGoal(((User) auth.getPrincipal()).getId(), request);
    }

    @PostMapping("/movements")
    @ResponseStatus(HttpStatus.CREATED)
    public ReserveMovementResponse createMovement(Authentication auth, @Valid @RequestBody ReserveMovementRequest request) {
        return service.createMovement(((User) auth.getPrincipal()).getId(), request);
    }
}
