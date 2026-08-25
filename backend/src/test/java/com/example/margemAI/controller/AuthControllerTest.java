package com.example.margemAI.controller;

import com.example.margemAI.dto.request.RegisterRequest;
import com.example.margemAI.dto.response.AuthResponse;
import com.example.margemAI.dto.response.UserResponse;
import com.example.margemAI.exception.DuplicateResourceException;
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
}
