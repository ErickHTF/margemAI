package com.example.margemAI.controller;

import com.example.margemAI.dto.request.MeiObligationReminderRequest;
import com.example.margemAI.dto.request.MeiObligationStatusUpdateRequest;
import com.example.margemAI.dto.response.MeiObligationResponse;
import com.example.margemAI.dto.response.MeiObligationScheduleResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.MeiObligationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/obligations", "/obligations"})
@RequiredArgsConstructor
public class MeiObligationController {

    private final MeiObligationService meiObligationService;

    @GetMapping
    public ResponseEntity<MeiObligationScheduleResponse> getSchedule(
            @RequestParam(required = false) Integer year,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        return ResponseEntity.ok(meiObligationService.getSchedule(userId, year));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MeiObligationResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody MeiObligationStatusUpdateRequest request,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        return ResponseEntity.ok(meiObligationService.updateObligationStatus(userId, id, request));
    }

    @PatchMapping("/reminders")
    public ResponseEntity<MeiObligationScheduleResponse> updateReminders(
            @Valid @RequestBody MeiObligationReminderRequest request,
            Authentication authentication) {
        UUID userId = authenticatedUserId(authentication);
        return ResponseEntity.ok(meiObligationService.updateReminderSettings(userId, request));
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
