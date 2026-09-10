package com.example.margemAI.controller;

import com.example.margemAI.dto.response.UserResponse;
import com.example.margemAI.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = {"/v1/me", "/me"})
public class UserController {

    @GetMapping
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        UserResponse response = UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .cnpj(user.getCnpj())
                .segment(user.getSegment().getCode())
                .build();
        return ResponseEntity.ok(response);
    }
}
