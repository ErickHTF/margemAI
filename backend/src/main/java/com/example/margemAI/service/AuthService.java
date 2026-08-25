package com.example.margemAI.service;

import com.example.margemAI.dto.request.RegisterRequest;
import com.example.margemAI.dto.response.AuthResponse;
import com.example.margemAI.dto.response.UserResponse;
import com.example.margemAI.exception.DuplicateResourceException;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedCnpj = request.getCnpj().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("O e-mail informado já está cadastrado no sistema.");
        }

        if (userRepository.existsByCnpj(normalizedCnpj)) {
            throw new DuplicateResourceException("O CNPJ informado já está cadastrado no sistema.");
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .cnpj(normalizedCnpj)
                .segment(request.getSegment())
                .build();

        User savedUser = userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(savedUser);
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        UserResponse userResponse = UserResponse.builder()
                .id(savedUser.getId())
                .name(savedUser.getName())
                .email(savedUser.getEmail())
                .build();

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .type("Bearer")
                .expiresIn(3600L)
                .user(userResponse)
                .build();
    }
}
