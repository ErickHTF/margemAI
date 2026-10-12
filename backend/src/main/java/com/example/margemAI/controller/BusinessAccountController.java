package com.example.margemAI.controller;
import com.example.margemAI.dto.request.*;
import com.example.margemAI.dto.response.*;
import com.example.margemAI.model.User;
import com.example.margemAI.service.BusinessAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController @RequiredArgsConstructor
@RequestMapping({"/accounts", "/v1/accounts"})
public class BusinessAccountController {
    private final BusinessAccountService service;
    @GetMapping public List<BusinessAccountResponse> list(Authentication auth) {
        return service.list(((User) auth.getPrincipal()).getId());
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public BusinessAccountResponse create(Authentication auth, @Valid @RequestBody BusinessAccountRequest request) {
        return service.create(((User) auth.getPrincipal()).getId(), request);
    }
    @GetMapping("/movements") public List<AccountMovementResponse> history(Authentication auth, @RequestParam(required = false) UUID accountId) {
        return service.history(((User) auth.getPrincipal()).getId(), accountId);
    }
    @PostMapping("/movements") @ResponseStatus(HttpStatus.CREATED)
    public AccountMovementResponse movement(Authentication auth, @Valid @RequestBody AccountMovementRequest request) {
        return service.createMovement(((User) auth.getPrincipal()).getId(), request);
    }
}
