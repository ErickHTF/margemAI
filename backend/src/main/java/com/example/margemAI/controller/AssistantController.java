package com.example.margemAI.controller;

import com.example.margemAI.dto.request.AssistantChatRequest;
import com.example.margemAI.dto.response.AssistantReplyResponse;
import com.example.margemAI.dto.response.AssistantStatusResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.assistant.AssistantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping(path = {"/v1/assistant", "/assistant"})
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    @GetMapping("/status")
    public ResponseEntity<AssistantStatusResponse> status(Authentication authentication) {
        return ResponseEntity.ok(assistantService.status(authenticatedUserId(authentication)));
    }

    @PostMapping("/messages")
    public ResponseEntity<AssistantReplyResponse> reply(
            @Valid @RequestBody AssistantChatRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(assistantService.reply(authenticatedUserId(authentication), request));
    }

    private UUID authenticatedUserId(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
