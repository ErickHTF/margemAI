package com.example.margemAI.service;

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
import com.example.margemAI.security.service.AuthService;
import com.example.margemAI.security.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SegmentService segmentService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRequest;
    private Segment segment;
    private User savedUser;

    @BeforeEach
    void setUp() {
        segment = Segment.builder()
                .id(UUID.randomUUID())
                .code("COMERCIO")
                .name("Comércio")
                .active(true)
                .build();

        validRequest = RegisterRequest.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password("Senha@123")
                .cnpj("12.ABC.345/0001-90")
                .segment("COMERCIO")
                .build();

        savedUser = User.builder()
                .id(UUID.randomUUID())
                .name("Maria Silva")
                .email("maria@email.com")
                .password("encoded_password")
                .cnpj("12ABC345000190")
                .segment(segment)
                .build();
    }

    @Test
    void shouldRegisterUserSuccessfully() {
        when(userRepository.existsByEmail("maria@email.com")).thenReturn(false);
        when(userRepository.existsByCnpj("12ABC345000190")).thenReturn(false);
        when(segmentService.findByCode("COMERCIO")).thenReturn(segment);
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
        assertEquals("12ABC345000190", response.getUser().getCnpj());
        assertEquals("COMERCIO", response.getUser().getSegment());

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
        when(userRepository.existsByCnpj("12ABC345000190")).thenReturn(true);

        DuplicateResourceException exception = assertThrows(
                DuplicateResourceException.class,
                () -> authService.register(validRequest)
        );

        assertEquals("O CNPJ informado já está cadastrado no sistema.", exception.getMessage());
    }

    @Test
    void shouldLoginSuccessfully() {
        when(userRepository.findByEmail("maria@email.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("Senha@123", "encoded_password")).thenReturn(true);
        when(jwtService.generateAccessToken(savedUser)).thenReturn("access_token_sample");
        when(jwtService.generateRefreshToken(savedUser)).thenReturn("refresh_token_sample");

        LoginRequest request = LoginRequest.builder()
                .identifier("  Maria@Email.com ")
                .password("Senha@123")
                .build();

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access_token_sample", response.getAccessToken());
        assertEquals("refresh_token_sample", response.getRefreshToken());
        assertEquals("Bearer", response.getType());
        assertEquals(3600L, response.getExpiresIn());
        assertEquals(savedUser.getId(), response.getUser().getId());
        assertEquals("maria@email.com", response.getUser().getEmail());
    }

    @Test
    void shouldLoginSuccessfullyWithMaskedNumericCnpj() {
        when(userRepository.findByCnpj("12ABC345000190")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("Senha@123", "encoded_password")).thenReturn(true);
        when(jwtService.generateAccessToken(savedUser)).thenReturn("access_token_sample");
        when(jwtService.generateRefreshToken(savedUser)).thenReturn("refresh_token_sample");

        LoginRequest request = LoginRequest.builder()
                .identifier("12.ABC.345/0001-90")
                .password("Senha@123")
                .build();

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals(savedUser.getId(), response.getUser().getId());
        assertEquals("12ABC345000190", response.getUser().getCnpj());
    }

    @Test
    void shouldLoginSuccessfullyWithUnmaskedNumericCnpj() {
        when(userRepository.findByCnpj("12ABC345000190")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("Senha@123", "encoded_password")).thenReturn(true);
        when(jwtService.generateAccessToken(savedUser)).thenReturn("access_token_sample");
        when(jwtService.generateRefreshToken(savedUser)).thenReturn("refresh_token_sample");

        LoginRequest request = LoginRequest.builder()
                .identifier("12ABC345000190")
                .password("Senha@123")
                .build();

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals(savedUser.getId(), response.getUser().getId());
    }

    @Test
    void shouldThrowExceptionWhenPasswordDoesNotMatch() {
        when(userRepository.findByEmail("maria@email.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("SenhaErrada@1", "encoded_password")).thenReturn(false);

        LoginRequest request = LoginRequest.builder()
                .identifier("maria@email.com")
                .password("SenhaErrada@1")
                .build();

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> authService.login(request)
        );

        assertEquals("E-mail/CNPJ ou senha inválidos.", exception.getMessage());
    }

    @Test
    void shouldThrowExceptionWhenUserDoesNotExist() {
        when(userRepository.findByEmail("nao.existe@email.com")).thenReturn(Optional.empty());

        LoginRequest request = LoginRequest.builder()
                .identifier("nao.existe@email.com")
                .password("Senha@123")
                .build();

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void shouldThrowExceptionWhenCnpjUserDoesNotExist() {
        when(userRepository.findByCnpj("99999999000199")).thenReturn(Optional.empty());

        LoginRequest request = LoginRequest.builder()
                .identifier("999.999.990/0019-9")
                .password("Senha@123")
                .build();

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void shouldThrowExceptionWhenPasswordDoesNotMatchForCnpjLogin() {
        when(userRepository.findByCnpj("12ABC345000190")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("SenhaErrada@1", "encoded_password")).thenReturn(false);

        LoginRequest request = LoginRequest.builder()
                .identifier("12.ABC.345/0001-90")
                .password("SenhaErrada@1")
                .build();

        InvalidCredentialsException exception = assertThrows(
                InvalidCredentialsException.class,
                () -> authService.login(request)
        );

        assertEquals("E-mail/CNPJ ou senha inválidos.", exception.getMessage());
    }

    @Test
    void shouldRefreshTokenSuccessfully() {
        when(jwtService.isRefreshTokenValid("valid_refresh_jwt")).thenReturn(true);
        when(jwtService.extractUserId("valid_refresh_jwt")).thenReturn(savedUser.getId());
        when(userRepository.findById(savedUser.getId())).thenReturn(Optional.of(savedUser));
        when(jwtService.generateAccessToken(savedUser)).thenReturn("new_access_token");
        when(jwtService.generateRefreshToken(savedUser)).thenReturn("new_refresh_token");

        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("valid_refresh_jwt")
                .build();

        AuthResponse response = authService.refresh(request);

        assertNotNull(response);
        assertEquals("new_access_token", response.getAccessToken());
        assertEquals("new_refresh_token", response.getRefreshToken());
        assertEquals(savedUser.getId(), response.getUser().getId());
    }

    @Test
    void shouldThrowExceptionWhenRefreshTokenIsInvalid() {
        when(jwtService.isRefreshTokenValid(eq("expired_refresh_jwt"))).thenReturn(false);

        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("expired_refresh_jwt")
                .build();

        InvalidTokenException exception = assertThrows(
                InvalidTokenException.class,
                () -> authService.refresh(request)
        );

        assertEquals("O refresh token informado é inválido ou expirou.", exception.getMessage());
    }

    @Test
    void shouldThrowExceptionWhenRefreshUserDoesNotExist() {
        when(jwtService.isRefreshTokenValid("valid_refresh_jwt")).thenReturn(true);
        when(jwtService.extractUserId("valid_refresh_jwt")).thenReturn(UUID.randomUUID());
        when(userRepository.findById(any(UUID.class))).thenReturn(Optional.empty());

        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("valid_refresh_jwt")
                .build();

        assertThrows(InvalidTokenException.class, () -> authService.refresh(request));
    }
}
