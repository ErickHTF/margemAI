package com.example.margemAI.controller;

import com.example.margemAI.dto.response.MonthlyFlowResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/dashboard", "/dashboard"})
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/monthly-flow")
    public ResponseEntity<MonthlyFlowResponse> getMonthlyFlow(
            @RequestParam(required = false) Integer months,
            @RequestParam(required = false) String endMonth,
            Authentication authentication
    ) {
        MonthlyFlowResponse response = dashboardService.getMonthlyFlow(authenticatedUserId(authentication), months, endMonth);
        return ResponseEntity.ok(response);
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
