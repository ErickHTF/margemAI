package com.example.margemAI.controller;

import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User savedUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("COMERCIO")
                        .name("Comércio Varejista e Atacadista")
                        .active(true)
                        .build()));

        savedUser = userRepository.save(User.builder()
                .name("Maria Silva")
                .email("maria@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("12.ABC.345/0001-90")
                .segment(segment)
                .build());
    }

    @Test
    void shouldReturn401WhenAccessingProtectedRouteWithoutToken() throws Exception {
        mockMvc.perform(get("/v1/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value(
                        "Autenticação necessária. Envie um Bearer Token válido no header Authorization."));
    }

    @Test
    void shouldReturn401WhenAccessingProtectedRouteWithInvalidToken() throws Exception {
        mockMvc.perform(get("/v1/me")
                        .header("Authorization", "Bearer token-invalido"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void shouldReturn401WhenUsingRefreshTokenOnProtectedRoute() throws Exception {
        String refreshToken = jwtService.generateRefreshToken(savedUser);

        mockMvc.perform(get("/v1/me")
                        .header("Authorization", "Bearer " + refreshToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void shouldReturn200WhenAccessingProtectedRouteWithValidAccessToken() throws Exception {
        String accessToken = jwtService.generateAccessToken(savedUser);

        mockMvc.perform(get("/v1/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maria Silva"))
                .andExpect(jsonPath("$.email").value("maria@email.com"))
                .andExpect(jsonPath("$.segment").value("COMERCIO"));
    }
}
