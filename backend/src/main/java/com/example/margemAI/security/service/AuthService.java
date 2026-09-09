package com.example.margemAI.security.service;

import com.example.margemAI.dto.response.UserResponse;
import com.example.margemAI.exception.DuplicateResourceException;
import com.example.margemAI.exception.InvalidCredentialsException;
import com.example.margemAI.exception.InvalidTokenException;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.security.dto.request.LoginRequest;
import com.example.margemAI.security.dto.request.RefreshRequest;
import com.example.margemAI.security.dto.request.RegisterRequest;
import com.example.margemAI.security.dto.response.AuthResponse;
import com.example.margemAI.service.SegmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final SegmentService segmentService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       SegmentService segmentService,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.segmentService = segmentService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedCnpj = normalizeCnpj(request.getCnpj());

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("O e-mail informado já está cadastrado no sistema.");
        }

        if (userRepository.existsByCnpj(normalizedCnpj)) {
            throw new DuplicateResourceException("O CNPJ informado já está cadastrado no sistema.");
        }

        Segment segment = segmentService.findByCode(request.getSegment());

        User user = User.builder()
                .name(request.getName().trim())
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.getPassword()))
                .cnpj(normalizedCnpj)
                .segment(segment)
                .build();

        User savedUser = userRepository.save(user);

        return buildAuthResponse(savedUser);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier().trim();

        User user = findByLoginIdentifier(identifier)
                .orElseThrow(() -> new InvalidCredentialsException("E-mail/CNPJ ou senha inválidos."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("E-mail/CNPJ ou senha inválidos.");
        }

        return buildAuthResponse(user);
    }

    private Optional<User> findByLoginIdentifier(String identifier) {
        if (isEmail(identifier)) {
            return userRepository.findByEmail(identifier.toLowerCase());
        }
        return userRepository.findByCnpj(normalizeCnpj(identifier));
    }

    private boolean isEmail(String value) {
        return value.contains("@");
    }

    private String normalizeCnpj(String cnpj) {
        return cnpj.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest request) {
        if (!jwtService.isRefreshTokenValid(request.getRefreshToken())) {
            throw new InvalidTokenException("O refresh token informado é inválido ou expirou.");
        }

        UUID userId = jwtService.extractUserId(request.getRefreshToken());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidTokenException("O usuário associado ao token não existe mais."));

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        UserResponse userResponse = UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .cnpj(user.getCnpj())
                .segment(user.getSegment().getCode())
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
