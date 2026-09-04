package com.example.margemAI.controller;

import com.example.margemAI.dto.request.ProfileUpdateRequest;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User savedUser;
    private String accessToken;

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
                .cnpj("12ABC345000190")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    @Test
    void shouldReturn401WhenProfileRequestedWithoutToken() throws Exception {
        mockMvc.perform(get("/v1/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void shouldGetProfileAndReturn200() throws Exception {
        mockMvc.perform(get("/v1/profile")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedUser.getId().toString()))
                .andExpect(jsonPath("$.name").value("Maria Silva"))
                .andExpect(jsonPath("$.email").value("maria@email.com"))
                .andExpect(jsonPath("$.cnpj").value("12ABC345000190"))
                .andExpect(jsonPath("$.segment").value("COMERCIO"))
                .andExpect(jsonPath("$.customAnnualCap").value(81000))
                .andExpect(jsonPath("$.createdAt").exists())
                .andExpect(jsonPath("$.updatedAt").exists());
    }

    @Test
    void shouldFullyUpdateProfileWithPutAndPersist() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("Maria Souza")
                .segment("SERVICOS")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        mockMvc.perform(put("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maria Souza"))
                .andExpect(jsonPath("$.segment").value("SERVICOS"))
                .andExpect(jsonPath("$.customAnnualCap").value(95000))
                .andExpect(jsonPath("$.email").value("maria@email.com"))
                .andExpect(jsonPath("$.cnpj").value("12ABC345000190"));

        mockMvc.perform(get("/v1/profile")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maria Souza"))
                .andExpect(jsonPath("$.segment").value("SERVICOS"))
                .andExpect(jsonPath("$.customAnnualCap").value(95000));
    }

    @Test
    void shouldReturn400WhenPutMissesRequiredField() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("Maria Souza")
                .segment("SERVICOS")
                .build();

        mockMvc.perform(put("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn400WhenPutHasTooShortName() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("A")
                .segment("SERVICOS")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        mockMvc.perform(put("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn404WhenPutUsesUnknownSegment() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("Maria Souza")
                .segment("NAO_EXISTE")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        mockMvc.perform(put("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldPatchOnlySegment() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .segment("SERVICOS")
                .build();

        mockMvc.perform(patch("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maria Silva"))
                .andExpect(jsonPath("$.segment").value("SERVICOS"))
                .andExpect(jsonPath("$.customAnnualCap").value(81000));
    }

    @Test
    void shouldPatchOnlyCustomAnnualCap() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .customAnnualCap(new BigDecimal("60000.00"))
                .build();

        mockMvc.perform(patch("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maria Silva"))
                .andExpect(jsonPath("$.segment").value("COMERCIO"))
                .andExpect(jsonPath("$.customAnnualCap").value(60000));
    }

    @Test
    void shouldReturn400WhenPatchHasNegativeCap() throws Exception {
        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .customAnnualCap(new BigDecimal("-1"))
                .build();

        mockMvc.perform(patch("/v1/profile")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
