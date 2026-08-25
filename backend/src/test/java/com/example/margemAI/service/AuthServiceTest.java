package com.example.margemAI.service;

import com.example.margemAI.dto.request.RegisterRequest;
import com.example.margemAI.dto.response.AuthResponse;
import com.example.margemAI.exception.DuplicateResourceException;
import com.example.margemAI.model.MeiSegment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRequest;
    private User savedUser;

    @BeforeEach
    void setUp() {
        validRequest = RegisterRequest.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password("Senha@123")
                .cnpj("12.345.678/0001-90")
                .segment(MeiSegment.COMERCIO)
                .build();

        savedUser = User.builder()
                .id(UUID.randomUUID())
                .name("Maria Silva")
                .email("maria@email.com")
                .password("encoded_password")
                .cnpj("12.345.678/0001-90")
                .segment(MeiSegment.COMERCIO)
                .build();
    }

    @Test
    void shouldRegisterUserSuccessfully() {
        when(userRepository.existsByEmail("maria@email.com")).thenReturn(false);
        when(userRepository.existsByCnpj("12.345.678/0001-90")).thenReturn(false);
        when(passwordEncoder.encode("Senha@123")).thenReturn("encoded_password");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateAccessToken(savedUser)).thenReturn("access_token_sample");
        when(jwtService.generateRefreshToken(savedUser)).thenReturn("refresh_token_sample");

        AuthResponse response = authService.register(validRequest);

        assertNotNull(response);
        assertEquals("access_token_sample", response.getAccessToken());
        assertEquals("refresh_token_sample", response.getRefreshToken());
        assertEquals("Bearer", response.getType());
        assertEquals(3600L, response.getExpiresIn());
        assertNotNull(response.getUser());
        assertEquals(savedUser.getId(), response.getUser().getId());
        assertEquals("Maria Silva", response.getUser().getName());
        assertEquals("maria@email.com", response.getUser().getEmail());

        verify(userRepository).save(any(User.class));
    }

    @Test
    void shouldThrowExceptionWhenEmailAlreadyExists() {
        when(userRepository.existsByEmail("maria@email.com")).thenReturn(true);

        DuplicateResourceException exception = assertThrows(
                DuplicateResourceException.class,
                () -> authService.register(validRequest)
        );

        assertEquals("O e-mail informado já está cadastrado no sistema.", exception.getMessage());
    }

    @Test
    void shouldThrowExceptionWhenCnpjAlreadyExists() {
        when(userRepository.existsByEmail("maria@email.com")).thenReturn(false);
        when(userRepository.existsByCnpj("12.345.678/0001-90")).thenReturn(true);

        DuplicateResourceException exception = assertThrows(
                DuplicateResourceException.class,
                () -> authService.register(validRequest)
        );

        assertEquals("O CNPJ informado já está cadastrado no sistema.", exception.getMessage());
    }
}
