package com.example.margemAI.service;

import com.example.margemAI.dto.request.MeiObligationReminderRequest;
import com.example.margemAI.dto.request.MeiObligationStatusUpdateRequest;
import com.example.margemAI.dto.response.MeiObligationResponse;
import com.example.margemAI.dto.response.MeiObligationScheduleResponse;
import com.example.margemAI.dto.response.MeiOfficialLinkResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.MeiObligation;
import com.example.margemAI.model.MeiObligationStatus;
import com.example.margemAI.model.MeiObligationType;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.MeiObligationRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeiObligationServiceTest {

    @Mock
    private MeiObligationRepository meiObligationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MeiObligationService meiObligationService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .name("Camila Costureira MEI")
                .email("camila@mei.com.br")
                .build();
    }

    @Test
    @DisplayName("Deve gerar de forma idempotente as 13 obrigações anuais (12 DAS + 1 DASN-SIMEI) com vencimentos oficiais e aviso declaratório")
    void shouldGenerateThirteenAnnualObligationsWithOfficialDueDatesAndDisclaimer() {
        int year = LocalDate.now().getYear();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(meiObligationRepository.findByUserIdAndReferenceYearOrderByDueDateAsc(userId, year))
                .thenReturn(List.of());
        when(meiObligationRepository.findFirstByUserIdOrderByUpdatedAtDesc(userId))
                .thenReturn(Optional.empty());
        when(meiObligationRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        MeiObligationScheduleResponse schedule = meiObligationService.getSchedule(userId, year);

        assertEquals(year, schedule.getYear());
        assertEquals(5, schedule.getReminderDaysBefore());
        assertEquals(13, schedule.getTotalCount());
        assertEquals("MANUAL_DECLARATION", schedule.getVerificationSource());
        assertFalse(schedule.isRegularityGuaranteed());
        assertTrue(schedule.getRegularityDisclaimer().contains("não comprova nem atesta regularidade fiscal"));

        long dasCount = schedule.getObligations().stream()
                .filter(item -> item.getObligationType() == MeiObligationType.DAS_MENSAL)
                .count();
        long dasnCount = schedule.getObligations().stream()
                .filter(item -> item.getObligationType() == MeiObligationType.DASN_SIMEI_ANUAL)
                .count();

        assertEquals(12, dasCount);
        assertEquals(1, dasnCount);

        MeiObligationResponse januaryDas = schedule.getObligations().stream()
                .filter(item -> (year + "-01").equals(item.getCompetency()))
                .findFirst()
                .orElseThrow();
        assertEquals(LocalDate.of(year, 2, 20), januaryDas.getDueDate());
        assertEquals(MeiObligationService.PGMEI_OFFICIAL_URL, januaryDas.getOfficialUrl());

        MeiObligationResponse decemberDas = schedule.getObligations().stream()
                .filter(item -> (year + "-12").equals(item.getCompetency()))
                .findFirst()
                .orElseThrow();
        assertEquals(LocalDate.of(year + 1, 1, 20), decemberDas.getDueDate());

        MeiObligationResponse annualDasn = schedule.getObligations().stream()
                .filter(item -> item.getObligationType() == MeiObligationType.DASN_SIMEI_ANUAL)
                .findFirst()
                .orElseThrow();
        assertEquals(String.valueOf(year - 1), annualDasn.getCompetency());
        assertEquals(LocalDate.of(year, 5, 31), annualDasn.getDueDate());
        assertEquals(MeiObligationService.DASN_SIMEI_OFFICIAL_URL, annualDasn.getOfficialUrl());

        List<String> officialUrls = schedule.getOfficialLinks().stream()
                .map(MeiOfficialLinkResponse::getUrl)
                .toList();
        assertTrue(officialUrls.contains(MeiObligationService.PGMEI_OFFICIAL_URL));
        assertTrue(officialUrls.contains(MeiObligationService.DASN_SIMEI_OFFICIAL_URL));
        assertTrue(officialUrls.contains(MeiObligationService.PORTAL_EMPREENDEDOR_OFFICIAL_URL));
        assertTrue(schedule.getOfficialLinks().stream().allMatch(MeiOfficialLinkResponse::isVerified));
    }

    @Test
    @DisplayName("Não deve duplicar competências já existentes ao consultar a agenda do mesmo ano")
    void shouldNotDuplicateExistingCompetenciesOnSubsequentCalls() {
        int year = 2026;
        List<MeiObligation> existing = new ArrayList<>();
        for (int month = 1; month <= 12; month++) {
            existing.add(MeiObligation.builder()
                    .id(UUID.randomUUID())
                    .user(user)
                    .obligationType(MeiObligationType.DAS_MENSAL)
                    .referenceYear(year)
                    .competency(String.format("%04d-%02d", year, month))
                    .dueDate(LocalDate.of(month == 12 ? year + 1 : year, month == 12 ? 1 : month + 1, 20))
                    .status(MeiObligationStatus.PAID_DECLARED)
                    .manualReceiptCode("DAS-REC-" + month)
                    .paidAt(LocalDate.of(year, 1, 15))
                    .reminderDaysBefore(7)
                    .build());
        }
        existing.add(MeiObligation.builder()
                .id(UUID.randomUUID())
                .user(user)
                .obligationType(MeiObligationType.DASN_SIMEI_ANUAL)
                .referenceYear(year)
                .competency("2025")
                .dueDate(LocalDate.of(year, 5, 31))
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("DASN-REC-2025")
                .paidAt(LocalDate.of(year, 5, 10))
                .reminderDaysBefore(7)
                .build());

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(meiObligationRepository.findByUserIdAndReferenceYearOrderByDueDateAsc(userId, year))
                .thenReturn(existing);

        MeiObligationScheduleResponse schedule = meiObligationService.getSchedule(userId, year);

        assertEquals(13, schedule.getTotalCount());
        assertEquals(13, schedule.getPaidDeclaredCount());
        assertEquals(7, schedule.getReminderDaysBefore());
        verify(meiObligationRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Deve registrar comprovante manual identificado e manter aviso de não-regularidade automática")
    void shouldRecordManualReceiptAndEnforceRegularityDisclaimer() {
        UUID obligationId = UUID.randomUUID();
        LocalDate today = LocalDate.now();
        MeiObligation obligation = MeiObligation.builder()
                .id(obligationId)
                .user(user)
                .obligationType(MeiObligationType.DAS_MENSAL)
                .referenceYear(today.getYear())
                .competency(today.getYear() + "-03")
                .dueDate(today.plusDays(3))
                .status(MeiObligationStatus.PENDING)
                .reminderDaysBefore(5)
                .build();

        when(meiObligationRepository.findByIdAndUserId(obligationId, userId)).thenReturn(Optional.of(obligation));
        when(meiObligationRepository.save(any(MeiObligation.class))).thenAnswer(inv -> inv.getArgument(0));

        MeiObligationStatusUpdateRequest request = MeiObligationStatusUpdateRequest.builder()
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("  07.20.26089.4410923-8  ")
                .paidAt(today.minusDays(1))
                .notes("Pago pelo aplicativo do banco PJ")
                .build();

        MeiObligationResponse response = meiObligationService.updateObligationStatus(userId, obligationId, request);

        assertEquals(MeiObligationStatus.PAID_DECLARED, response.getStatus());
        assertEquals("07.20.26089.4410923-8", response.getManualReceiptCode());
        assertEquals(today.minusDays(1), response.getPaidAt());
        assertEquals("Pago pelo aplicativo do banco PJ", response.getNotes());
        assertFalse(response.isDueSoon());
        assertFalse(response.isOverdue());
        assertEquals("MANUAL_DECLARATION", response.getVerificationSource());
        assertFalse(response.isRegularityGuaranteed());
    }

    @Test
    @DisplayName("Deve rejeitar marcação como cumprida quando comprovante manual não for informado")
    void shouldRejectPaidDeclaredStatusWithoutManualReceiptCode() {
        UUID obligationId = UUID.randomUUID();
        MeiObligation obligation = MeiObligation.builder()
                .id(obligationId)
                .user(user)
                .obligationType(MeiObligationType.DAS_MENSAL)
                .referenceYear(2026)
                .competency("2026-04")
                .dueDate(LocalDate.now().plusDays(10))
                .status(MeiObligationStatus.PENDING)
                .reminderDaysBefore(5)
                .build();

        when(meiObligationRepository.findByIdAndUserId(obligationId, userId)).thenReturn(Optional.of(obligation));

        MeiObligationStatusUpdateRequest request = MeiObligationStatusUpdateRequest.builder()
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("   ")
                .build();

        InvalidRequestException ex = assertThrows(
                InvalidRequestException.class,
                () -> meiObligationService.updateObligationStatus(userId, obligationId, request)
        );
        assertTrue(ex.getMessage().contains("comprovante"));
        verify(meiObligationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve reabrir obrigação limpa de comprovante e sinalizar atraso quando vencimento já passou")
    void shouldReopenObligationAndFlagOverdueWhenPastDueDate() {
        UUID obligationId = UUID.randomUUID();
        LocalDate pastDueDate = LocalDate.now().minusDays(4);
        MeiObligation obligation = MeiObligation.builder()
                .id(obligationId)
                .user(user)
                .obligationType(MeiObligationType.DAS_MENSAL)
                .referenceYear(pastDueDate.getYear())
                .competency(pastDueDate.getYear() + "-01")
                .dueDate(pastDueDate)
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("REC-999")
                .paidAt(pastDueDate.minusDays(1))
                .reminderDaysBefore(5)
                .build();

        when(meiObligationRepository.findByIdAndUserId(obligationId, userId)).thenReturn(Optional.of(obligation));
        when(meiObligationRepository.save(any(MeiObligation.class))).thenAnswer(inv -> inv.getArgument(0));

        MeiObligationStatusUpdateRequest reopenRequest = MeiObligationStatusUpdateRequest.builder()
                .status(MeiObligationStatus.PENDING)
                .notes("Reaberto para conferência")
                .build();

        MeiObligationResponse response = meiObligationService.updateObligationStatus(userId, obligationId, reopenRequest);

        assertEquals(MeiObligationStatus.OVERDUE, response.getStatus());
        assertTrue(response.isOverdue());
        assertNull(response.getManualReceiptCode());
        assertNull(response.getPaidAt());
        assertEquals("Reaberto para conferência", response.getNotes());
    }

    @Test
    @DisplayName("Deve atualizar antecedência de lembrete e sinalizar obrigações próximas do vencimento")
    void shouldUpdateReminderDaysAndFlagDueSoonObligations() {
        int year = LocalDate.now().getYear();
        LocalDate dueInEightDays = LocalDate.now().plusDays(8);

        MeiObligation sample = MeiObligation.builder()
                .id(UUID.randomUUID())
                .user(user)
                .obligationType(MeiObligationType.DAS_MENSAL)
                .referenceYear(year)
                .competency(year + "-01")
                .dueDate(dueInEightDays)
                .status(MeiObligationStatus.PENDING)
                .reminderDaysBefore(5)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(meiObligationRepository.findByUserIdAndReferenceYearOrderByDueDateAsc(userId, year))
                .thenReturn(new ArrayList<>(List.of(sample)));
        when(meiObligationRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(meiObligationRepository.findByUserId(userId)).thenReturn(List.of(sample));

        MeiObligationReminderRequest request = MeiObligationReminderRequest.builder()
                .reminderDaysBefore(10)
                .year(year)
                .build();

        MeiObligationScheduleResponse response = meiObligationService.updateReminderSettings(userId, request);

        assertEquals(10, response.getReminderDaysBefore());
        assertEquals(1, response.getDueSoonCount());
        assertTrue(response.getObligations().get(0).isDueSoon());
    }

    @Test
    @DisplayName("Deve impedir atualização de obrigação pertencente a outro usuário")
    void shouldThrowNotFoundWhenUpdatingObligationOfAnotherUser() {
        UUID obligationId = UUID.randomUUID();
        when(meiObligationRepository.findByIdAndUserId(obligationId, userId)).thenReturn(Optional.empty());

        MeiObligationStatusUpdateRequest request = MeiObligationStatusUpdateRequest.builder()
                .status(MeiObligationStatus.PAID_DECLARED)
                .manualReceiptCode("REC-123")
                .build();

        assertThrows(
                ResourceNotFoundException.class,
                () -> meiObligationService.updateObligationStatus(userId, obligationId, request)
        );
    }
}
