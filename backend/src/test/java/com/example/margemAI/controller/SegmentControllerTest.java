package com.example.margemAI.controller;

import com.example.margemAI.dto.response.SegmentCostSuggestionResponse;
import com.example.margemAI.dto.response.SegmentGuidanceResponse;
import com.example.margemAI.dto.response.SegmentResponse;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.security.service.JwtService;
import com.example.margemAI.service.SegmentGuidanceService;
import com.example.margemAI.service.SegmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SegmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SegmentService segmentService;

    @MockBean
    private SegmentGuidanceService segmentGuidanceService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    @Autowired
    private JwtService jwtService;

    private User createAuthenticatedUser() {
        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("COMERCIO")
                        .name("Comércio Varejista e Atacadista")
                        .active(true)
                        .build()));

        return userRepository.save(User.builder()
                .name("Empreendedor MEI")
                .email("segment.guidance@test.com")
                .password("hash")
                .cnpj("12345678000199")
                .segment(segment)
                .build());
    }

    @Test
    @DisplayName("Lista todos os segmentos ativos publicamente para o cadastro")
    void shouldReturnAllActiveSegments() throws Exception {
        SegmentResponse seg1 = SegmentResponse.builder()
                .id(UUID.randomUUID())
                .code("COMERCIO")
                .name("Comércio")
                .description("Venda de mercadorias")
                .build();

        SegmentResponse seg2 = SegmentResponse.builder()
                .id(UUID.randomUUID())
                .code("SERVICOS")
                .name("Serviços")
                .description("Prestação de serviços")
                .build();

        when(segmentService.findAllActive()).thenReturn(List.of(seg1, seg2));

        mockMvc.perform(get("/v1/segments").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("COMERCIO"))
                .andExpect(jsonPath("$[0].name").value("Comércio"))
                .andExpect(jsonPath("$[1].code").value("SERVICOS"))
                .andExpect(jsonPath("$[1].name").value("Serviços"));
    }

    @Test
    @DisplayName("Exige autenticação para consultar orientações por segmento")
    void shouldRequireAuthenticationForGuidance() throws Exception {
        mockMvc.perform(get("/v1/segments/guidance").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Retorna orientações versionadas do segmento do usuário autenticado com sugestões opcionais")
    void shouldReturnGuidanceForAuthenticatedUser() throws Exception {
        User user = createAuthenticatedUser();
        String token = "Bearer " + jwtService.generateAccessToken(user);

        SegmentGuidanceResponse guidance = SegmentGuidanceResponse.builder()
                .ruleVersion("2026.1")
                .segmentCode("COMERCIO")
                .segmentName("Comércio Varejista e Atacadista")
                .fallbackUsed(false)
                .sebraeGuidanceSummary("No Comércio, controle embalagens e frete por venda.")
                .costSuggestions(List.of(
                        SegmentCostSuggestionResponse.builder()
                                .code("COM_EMB_01")
                                .name("Embalagens, sacolas e etiquetas")
                                .costType("VARIABLE")
                                .category("EMBALAGEM")
                                .suggestedAmount(new BigDecimal("1.50"))
                                .suggestedPercent(new BigDecimal("3.00"))
                                .whyItMatters("No comércio, sacolas e caixas compõem o custo direto da venda.")
                                .mandatory(false)
                                .build()
                ))
                .build();

        when(segmentGuidanceService.getGuidance(eq(user.getId()), isNull(), isNull()))
                .thenReturn(guidance);

        mockMvc.perform(get("/v1/segments/guidance")
                        .header("Authorization", token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ruleVersion").value("2026.1"))
                .andExpect(jsonPath("$.segmentCode").value("COMERCIO"))
                .andExpect(jsonPath("$.segmentName").value("Comércio Varejista e Atacadista"))
                .andExpect(jsonPath("$.fallbackUsed").value(false))
                .andExpect(jsonPath("$.costSuggestions.length()").value(1))
                .andExpect(jsonPath("$.costSuggestions[0].code").value("COM_EMB_01"))
                .andExpect(jsonPath("$.costSuggestions[0].mandatory").value(false))
                .andExpect(jsonPath("$.costSuggestions[0].whyItMatters").isNotEmpty());
    }

    @Test
    @DisplayName("Permite consultar orientações filtrando por segmentName e mantendo fallback genérico")
    void shouldReturnFallbackGuidanceWhenQueriedByUnknownSegmentName() throws Exception {
        User user = createAuthenticatedUser();
        String token = "Bearer " + jwtService.generateAccessToken(user);

        SegmentGuidanceResponse fallbackGuidance = SegmentGuidanceResponse.builder()
                .ruleVersion("2026.1")
                .segmentCode("GERAL")
                .segmentName("Geral (MEI)")
                .fallbackUsed(true)
                .sebraeGuidanceSummary("Orientação geral SEBRAE para MEI.")
                .costSuggestions(List.of(
                        SegmentCostSuggestionResponse.builder()
                                .code("GEN_DAS_01")
                                .name("Guia mensal DAS MEI")
                                .costType("FIXED")
                                .category("DAS_MEI")
                                .suggestedAmount(new BigDecimal("76.90"))
                                .whyItMatters("Obrigação mensal fixa do MEI.")
                                .mandatory(false)
                                .build()
                ))
                .build();

        when(segmentGuidanceService.getGuidance(eq(user.getId()), isNull(), eq("OUTRO")))
                .thenReturn(fallbackGuidance);

        mockMvc.perform(get("/v1/segments/guidance")
                        .param("segmentName", "OUTRO")
                        .header("Authorization", token)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ruleVersion").value("2026.1"))
                .andExpect(jsonPath("$.segmentCode").value("GERAL"))
                .andExpect(jsonPath("$.fallbackUsed").value(true))
                .andExpect(jsonPath("$.costSuggestions[0].mandatory").value(false));
    }
}
