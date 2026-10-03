package com.example.margemAI.controller;

import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.service.AlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AlertControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AlertService alertService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .name("Empreendedor Teste")
                .email("empreendedor@teste.com")
                .build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("Deve retornar status 200 e dados do teto MEI para usuário autenticado")
    void shouldReturnMeiCapStatusForAuthenticatedUser() throws Exception {
        MeiCapResponse response = MeiCapResponse.builder()
                .annualLimit(new BigDecimal("81000.00"))
                .proRata(false)
                .activeMonths(12)
                .monthlyCap(new BigDecimal("6750.00"))
                .accumulatedRevenue(new BigDecimal("50000.00"))
                .usagePercent(new BigDecimal("61.73"))
                .remainingAmount(new BigDecimal("31000.00"))
                .severity("NORMAL")
                .recommendationMessage("Faturamento dentro da faixa segura do MEI.")
                .build();

        when(alertService.getMeiCapStatus(eq(userId), any())).thenReturn(response);

        mockMvc.perform(get("/v1/alerts/mei-cap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.annualLimit").value(81000.00))
                .andExpect(jsonPath("$.usagePercent").value(61.73))
                .andExpect(jsonPath("$.severity").value("NORMAL"))
                .andExpect(jsonPath("$.proRata").value(false));
    }

    @Test
    @DisplayName("Deve retornar 401 para requisição não autenticada")
    void shouldReturn401WhenUnauthenticated() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(get("/v1/alerts/mei-cap"))
                .andExpect(status().isUnauthorized());
    }
}
