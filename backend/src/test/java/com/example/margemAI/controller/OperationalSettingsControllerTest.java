package com.example.margemAI.controller;

import com.example.margemAI.dto.request.RateioConfigRequest;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.RevenueBaselineMode;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.security.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class OperationalSettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private FixedCostRepository fixedCostRepository;

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
        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("COMERCIO")
                        .name("Comércio Varejista e Atacadista")
                        .active(true)
                        .build()));

        savedUser = userRepository.save(User.builder()
                .name("Maria Silva")
                .email("maria.operational@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("12ABC345000199")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    private void createFixedCost(String amount, boolean active) {
        fixedCostRepository.save(FixedCost.builder()
                .name("Aluguel")
                .amount(new BigDecimal(amount))
                .category(FixedCostCategory.ALUGUEL)
                .active(active)
                .recurring(true)
                .user(savedUser)
                .build());
    }

    @Test
    void shouldReturn401WithoutToken() throws Exception {
        mockMvc.perform(get("/v1/settings/operational/fixed-costs-summary"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnSummaryWithConsolidatedFixedCosts() throws Exception {
        createFixedCost("600.00", true);
        createFixedCost("400.00", true);
        createFixedCost("999.00", false);

        mockMvc.perform(patch("/v1/settings/operational/rateio-config")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RateioConfigRequest.builder()
                                .revenueBaselineMode(RevenueBaselineMode.TARGET_REVENUE)
                                .monthlyRevenueTarget(new BigDecimal("2000.00"))
                                .automaticRateio(true)
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFixedCosts").value(1000.00))
                .andExpect(jsonPath("$.revenueBaseline").value(2000.00))
                .andExpect(jsonPath("$.allocatedFixedCostPercent").value(50.00))
                .andExpect(jsonPath("$.severeRisk").value(false));

        mockMvc.perform(get("/v1/settings/operational/fixed-costs-summary")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalFixedCosts").value(1000.00))
                .andExpect(jsonPath("$.allocatedFixedCostPercent").value(50.00));
    }

    @Test
    void shouldFlagSevereRiskWhenFixedCostsExceedEightyPercent() throws Exception {
        createFixedCost("850.00", true);

        mockMvc.perform(patch("/v1/settings/operational/rateio-config")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RateioConfigRequest.builder()
                                .revenueBaselineMode(RevenueBaselineMode.TARGET_REVENUE)
                                .monthlyRevenueTarget(new BigDecimal("1000.00"))
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allocatedFixedCostPercent").value(85.00))
                .andExpect(jsonPath("$.severeRisk").value(true));
    }

    @Test
    void shouldUseManualPercentWhenAutomaticIsDisabled() throws Exception {
        createFixedCost("500.00", true);

        mockMvc.perform(patch("/v1/settings/operational/rateio-config")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RateioConfigRequest.builder()
                                .automaticRateio(false)
                                .manualAllocatedFixedCostPercent(new BigDecimal("15.00"))
                                .build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.allocatedFixedCostPercent").value(15.00))
                .andExpect(jsonPath("$.automaticRateio").value(false));
    }

    @Test
    void shouldRejectManualPercentAboveLimit() throws Exception {
        mockMvc.perform(patch("/v1/settings/operational/rateio-config")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(RateioConfigRequest.builder()
                                .automaticRateio(false)
                                .manualAllocatedFixedCostPercent(new BigDecimal("150.00"))
                                .build())))
                .andExpect(status().isBadRequest());
    }
}
