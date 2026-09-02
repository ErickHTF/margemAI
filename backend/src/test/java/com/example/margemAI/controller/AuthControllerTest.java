package com.example.margemAI.controller;

import com.example.margemAI.dto.request.LoginRequest;
import com.example.margemAI.dto.request.RefreshRequest;
import com.example.margemAI.dto.request.RegisterRequest;
import com.example.margemAI.dto.response.AuthResponse;
import com.example.margemAI.dto.response.UserResponse;
import com.example.margemAI.exception.DuplicateResourceException;
import com.example.margemAI.exception.InvalidCredentialsException;
import com.example.margemAI.exception.InvalidTokenException;
import com.example.margemAI.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    void shouldRegisterUserAndReturn201Created() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password("Senha@123")
                .cnpj("12.ABC.345/0001-90")
                .segment("COMERCIO")
                .build();

        AuthResponse response = AuthResponse.builder()
                .accessToken("sample_access_jwt")
                .refreshToken("sample_refresh_jwt")
                .type("Bearer")
                .expiresIn(3600L)
                .user(UserResponse.builder()
                        .id(UUID.randomUUID())
                        .name("Maria Silva")
                        .email("maria@email.com")
                        .cnpj("12.ABC.345/0001-90")
                        .segment("COMERCIO")
                        .build())
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("sample_access_jwt"))
                .andExpect(jsonPath("$.refreshToken").value("sample_refresh_jwt"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(jsonPath("$.user.name").value("Maria Silva"))
                .andExpect(jsonPath("$.user.email").value("maria@email.com"))
                .andExpect(jsonPath("$.user.cnpj").value("12.ABC.345/0001-90"))
                .andExpect(jsonPath("$.user.segment").value("COMERCIO"));
    }

    @Test
    void shouldReturn409ConflictWhenResourceAlreadyExists() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password("Senha@123")
                .cnpj("12.ABC.345/0001-90")
                .segment("COMERCIO")
                .build();

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateResourceException("O e-mail informado já está cadastrado no sistema."));

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"))
                .andExpect(jsonPath("$.message").value("O e-mail informado já está cadastrado no sistema."));
    }

    @Test
    void shouldReturn400BadRequestWhenPasswordIsWeak() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password("123456")
                .cnpj("12.ABC.345/0001-90")
                .segment("COMERCIO")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn400BadRequestWhenCnpjIsInvalid() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password("Senha@123")
                .cnpj("1234")
                .segment("COMERCIO")
                .build();

        mockMvc.perform(post("/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldLoginAndReturn200Ok() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .identifier("maria@email.com")
                .password("Senha@123")
                .build();

        AuthResponse response = AuthResponse.builder()
                .accessToken("sample_access_jwt")
                .refreshToken("sample_refresh_jwt")
                .type("Bearer")
                .expiresIn(3600L)
                .user(UserResponse.builder()
                        .id(UUID.randomUUID())
                        .name("Maria Silva")
                        .email("maria@email.com")
                        .cnpj("12.ABC.345/0001-90")
                        .segment("COMERCIO")
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("sample_access_jwt"))
                .andExpect(jsonPath("$.refreshToken").value("sample_refresh_jwt"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andExpect(jsonPath("$.user.email").value("maria@email.com"));
    }

    @Test
    void shouldLoginWithMaskedCnpjAndReturn200Ok() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .identifier("12.ABC.345/0001-90")
                .password("Senha@123")
                .build();

        AuthResponse response = AuthResponse.builder()
                .accessToken("sample_access_jwt")
                .refreshToken("sample_refresh_jwt")
                .type("Bearer")
                .expiresIn(3600L)
                .user(UserResponse.builder()
                        .id(UUID.randomUUID())
                        .name("Maria Silva")
                        .email("maria@email.com")
                        .cnpj("12ABC345000190")
                        .segment("COMERCIO")
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("sample_access_jwt"))
                .andExpect(jsonPath("$.user.cnpj").value("12ABC345000190"));
    }

    @Test
    void shouldLoginWithAlphanumericCnpjAndReturn200Ok() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .identifier("AB12CDE34000123")
                .password("Senha@123")
                .build();

        AuthResponse response = AuthResponse.builder()
                .accessToken("sample_access_jwt")
                .refreshToken("sample_refresh_jwt")
                .type("Bearer")
                .expiresIn(3600L)
                .user(UserResponse.builder()
                        .id(UUID.randomUUID())
                        .name("Maria Silva")
                        .email("maria@email.com")
                        .cnpj("AB12CDE34000123")
                        .segment("COMERCIO")
                        .build())
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.cnpj").value("AB12CDE34000123"));
    }

    @Test
    void shouldReturn401WhenCredentialsAreInvalid() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .identifier("maria@email.com")
                .password("SenhaErrada@1")
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new InvalidCredentialsException("E-mail/CNPJ ou senha inválidos."));

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value("E-mail/CNPJ ou senha inválidos."));
    }

    @Test
    void shouldReturn400BadRequestWhenLoginBodyIsInvalid() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .identifier("")
                .password("")
                .build();

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRefreshTokenAndReturn200Ok() throws Exception {
        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("sample_refresh_jwt")
                .build();

        AuthResponse response = AuthResponse.builder()
                .accessToken("new_access_jwt")
                .refreshToken("new_refresh_jwt")
                .type("Bearer")
                .expiresIn(3600L)
                .user(UserResponse.builder()
                        .id(UUID.randomUUID())
                        .name("Maria Silva")
                        .email("maria@email.com")
                        .cnpj("12.ABC.345/0001-90")
                        .segment("COMERCIO")
                        .build())
                .build();

        when(authService.refresh(any(RefreshRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new_access_jwt"))
                .andExpect(jsonPath("$.refreshToken").value("new_refresh_jwt"))
                .andExpect(jsonPath("$.type").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(3600));
    }

    @Test
    void shouldReturn401WhenRefreshTokenIsInvalid() throws Exception {
        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("invalid_refresh_jwt")
                .build();

        when(authService.refresh(any(RefreshRequest.class)))
                .thenThrow(new InvalidTokenException("O refresh token informado é inválido ou expirou."));

        mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_TOKEN"))
                .andExpect(jsonPath("$.message").value("O refresh token informado é inválido ou expirou."));
    }

    @Test
    void shouldReturn400BadRequestWhenRefreshBodyIsInvalid() throws Exception {
        RefreshRequest request = RefreshRequest.builder()
                .refreshToken("")
                .build();

        mockMvc.perform(post("/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
