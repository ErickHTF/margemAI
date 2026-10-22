package com.example.margemAI.controller;

import com.example.margemAI.dto.request.MeiObligationReminderRequest;
import com.example.margemAI.dto.request.MeiObligationStatusUpdateRequest;
import com.example.margemAI.dto.response.MeiObligationResponse;
import com.example.margemAI.dto.response.MeiObligationScheduleResponse;
import com.example.margemAI.dto.response.MeiOfficialLinkResponse;
import com.example.margemAI.model.MeiObligationStatus;
import com.example.margemAI.model.MeiObligationType;
import com.example.margemAI.model.User;
import com.example.margemAI.service.MeiObligationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeiObligationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MeiObligationService meiObligationService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .name("Empreendedor Agenda MEI")
                .email("agenda@mei.com.br")
                .build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user, null, List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("Deve retornar a agenda de obrigações MEI com links oficiais e aviso declaratório")
    void shouldReturnScheduleWithOfficialLinksAndDisclaimer() throws Exception {
        UUID obligationId = UUID.randomUUID();
        MeiObligationScheduleResponse response = MeiObligationScheduleResponse.builder()
                .year(2026)
                .reminderDaysBefore(7)
                .verificationSource("MANUAL_DECLARATION")
                .regularityGuaranteed(false)
                .regularityDisclaimer(MeiObligationService.REGULARITY_DISCLAIMER)
                .totalCount(13)
                .paidDeclaredCount(1)
                .pendingCount(12)
                .overdueCount(0)
                .dueSoonCount(2)
                .officialLinks(List.of(
                        MeiOfficialLinkResponse.builder()
                                .id("pgmei")
                                .label("PGMEI — Emissão do DAS")
                                .url(MeiObligationService.PGMEI_OFFICIAL_URL)
                                .verified(true)
                                .build()
                ))
                .obligations(List.of(
                        MeiObligationResponse.builder()
                                .id(obligationId)
                                .obligationType(MeiObligationType.DAS_MENSAL)
                                .title("DAS Mensal — Janeiro/2026")
                                .referenceYear(2026)
                                .competency("2026-01")
                                .dueDate(LocalDate.of(2026, 2, 20))
                                .status(MeiObligationStatus.PAID_DECLARED)
                                .manualReceiptCode("DAS-2026-01-9988")
                                .paidAt(LocalDate.of(2026, 2, 18))
                                .reminderDaysBefore(7)
                                .verificationSource("MANUAL_DECLARATION")
                                .regularityGuaranteed(false)
                                .build()
                ))
                .build();

        when(meiObligationService.getSchedule(eq(userId), eq(2026))).thenReturn(response);

        mockMvc.perform(get("/v1/obligations").param("year", "2026"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.reminderDaysBefore").value(7))
                .andExpect(jsonPath("$.verificationSource").value("MANUAL_DECLARATION"))
                .andExpect(jsonPath("$.regularityGuaranteed").value(false))
                .andExpect(jsonPath("$.officialLinks[0].url").value(MeiObligationService.PGMEI_OFFICIAL_URL))
                .andExpect(jsonPath("$.obligations[0].manualReceiptCode").value("DAS-2026-01-9988"));
    }

    @Test
    @DisplayName("Deve atualizar status da obrigação MEI com comprovante manual")
    void shouldUpdateObligationStatusWithManualReceipt() throws Exception {
        UUID obligationId = UUID.randomUUID();
        MeiObligationStatusUpdateRequest request = MeiObligationStatusUpdateRequest.builder()
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("RECIBO-DASN-2025-77")
                .paidAt(LocalDate.of(2026, 5, 12))
                .notes("Recibo arquivado na pasta fiscal")
                .build();

        MeiObligationResponse updated = MeiObligationResponse.builder()
                .id(obligationId)
                .obligationType(MeiObligationType.DASN_SIMEI_ANUAL)
                .title("DASN-SIMEI — Ano-calendário 2025")
                .referenceYear(2026)
                .competency("2025")
                .dueDate(LocalDate.of(2026, 5, 31))
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("RECIBO-DASN-2025-77")
                .paidAt(LocalDate.of(2026, 5, 12))
                .notes("Recibo arquivado na pasta fiscal")
                .verificationSource("MANUAL_DECLARATION")
                .regularityGuaranteed(false)
                .build();

        when(meiObligationService.updateObligationStatus(eq(userId), eq(obligationId), any()))
                .thenReturn(updated);

        mockMvc.perform(patch("/v1/obligations/{id}/status", obligationId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID_DECLARED"))
                .andExpect(jsonPath("$.manualReceiptCode").value("RECIBO-DASN-2025-77"))
                .andExpect(jsonPath("$.verificationSource").value("MANUAL_DECLARATION"))
                .andExpect(jsonPath("$.regularityGuaranteed").value(false));
    }

    @Test
    @DisplayName("Deve retornar 400 ao configurar lembrete fora do intervalo de 1 a 30 dias")
    void shouldReturn400WhenReminderDaysOutOfRange() throws Exception {
        MeiObligationReminderRequest invalidRequest = MeiObligationReminderRequest.builder()
                .reminderDaysBefore(45)
                .year(2026)
                .build();

        mockMvc.perform(patch("/v1/obligations/reminders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("Deve retornar 401 quando usuário não estiver autenticado")
    void shouldReturn401WhenUnauthenticated() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(get("/v1/obligations"))
                .andExpect(status().isUnauthorized());
    }
}
