package com.example.margemAI.service;

import com.example.margemAI.dto.request.DebtRequest;
import com.example.margemAI.dto.request.DebtSimulatePayoffRequest;
import com.example.margemAI.dto.request.PayInstallmentRequest;
import com.example.margemAI.dto.response.DebtInstallmentResponse;
import com.example.margemAI.dto.response.DebtPayoffSimulationResponse;
import com.example.margemAI.dto.response.DebtResponse;
import com.example.margemAI.dto.response.DebtSummaryResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Debt;
import com.example.margemAI.model.DebtInstallment;
import com.example.margemAI.model.DebtStatus;
import com.example.margemAI.model.InstallmentStatus;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.DebtInstallmentRepository;
import com.example.margemAI.repository.DebtRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock
    private DebtRepository debtRepository;

    @Mock
    private DebtInstallmentRepository debtInstallmentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private DebtService debtService;

    private final UUID userId = UUID.randomUUID();

    @Test
    @DisplayName("Cria dívida com parcelas automáticas e calcula custo total comparável")
    void createDebtCalculatesComparableCost() {
        User user = User.builder().id(userId).name("Empreendedor").build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(debtRepository.save(any(Debt.class))).thenAnswer(invocation -> {
            Debt d = invocation.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        DebtRequest request = DebtRequest.builder()
                .creditor("Banco do Povo")
                .description("Capital de Giro MEI")
                .principalAmount(new BigDecimal("10000.00"))
                .monthlyInterestRate(new BigDecimal("2.5000"))
                .fixedFeesAmount(new BigDecimal("200.00"))
                .totalInstallments(12)
                .installmentAmount(new BigDecimal("974.87"))
                .firstDueDate(LocalDate.of(2026, 11, 10))
                .build();

        DebtResponse response = debtService.create(userId, request);

        assertNotNull(response);
        assertEquals("Banco do Povo", response.getCreditor());
        assertEquals(new BigDecimal("10000.00"), response.getPrincipalAmount());
        assertEquals(12, response.getTotalInstallments());
        // (974.87 * 12) + 200.00 = 11698.44 + 200 = 11898.44
        assertEquals(new BigDecimal("11898.44"), response.getTotalContractedCost());
        // 11898.44 - 10000.00 = 1898.44
        assertEquals(new BigDecimal("1898.44"), response.getTotalInterestAndFees());
        // 11898.44 / 10000 = 1.1898x
        assertEquals(new BigDecimal("1.1898"), response.getEffectiveCostMultiple());
        // 1898.44 / 10000 * 100 = 18.98%
        assertEquals(new BigDecimal("18.98"), response.getEffectiveCostPercent());
        assertEquals(12, response.getInstallments().size());
        assertEquals(LocalDate.of(2026, 11, 10), response.getInstallments().get(0).getDueDate());
        assertEquals(LocalDate.of(2027, 10, 10), response.getInstallments().get(11).getDueDate());
    }

    @Test
    @DisplayName("Simula quitação antecipada trazendo parcelas finais a valor presente com hipóteses explícitas")
    void simulatePayoffWithExplicitAssumptions() {
        UUID debtId = UUID.randomUUID();
        User user = User.builder().id(userId).build();
        Debt debt = Debt.builder()
                .id(debtId)
                .creditor("CrediAmigo")
                .principalAmount(new BigDecimal("5000.00"))
                .monthlyInterestRate(new BigDecimal("3.0000"))
                .fixedFeesAmount(BigDecimal.ZERO)
                .totalInstallments(6)
                .installmentAmount(new BigDecimal("1000.00"))
                .firstDueDate(LocalDate.of(2026, 11, 1))
                .status(DebtStatus.ACTIVE)
                .user(user)
                .installments(new ArrayList<>())
                .build();

        for (int i = 1; i <= 6; i++) {
            DebtInstallment inst = DebtInstallment.builder()
                    .id(UUID.randomUUID())
                    .debt(debt)
                    .installmentNumber(i)
                    .dueDate(LocalDate.of(2026, 10, 1).plusMonths(i))
                    .amount(new BigDecimal("1000.00"))
                    .status(InstallmentStatus.PENDING)
                    .build();
            debt.addInstallment(inst);
        }

        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.of(debt));

        // Antecipa as últimas 2 parcelas (parcelas 5 e 6)
        DebtSimulatePayoffRequest req = DebtSimulatePayoffRequest.builder()
                .installmentsToAnticipate(2)
                .simulationDate(LocalDate.of(2026, 11, 1))
                .build();

        DebtPayoffSimulationResponse simulation = debtService.simulatePayoff(userId, debtId, req);

        assertNotNull(simulation);
        assertEquals(debtId, simulation.getDebtId());
        assertEquals(2, simulation.getInstallmentsCount());
        assertEquals(List.of(5, 6), simulation.getSimulatedInstallmentNumbers());
        assertEquals(new BigDecimal("2000.00"), simulation.getOriginalTotalAmount());
        assertTrue(simulation.getPayoffAmount().compareTo(new BigDecimal("2000.00")) < 0);
        assertTrue(simulation.getEstimatedSavings().compareTo(BigDecimal.ZERO) > 0);
        assertNotNull(simulation.getAssumptions());
        assertFalse(simulation.getAssumptions().isEmpty());
        assertTrue(simulation.getAssumptions().stream().anyMatch(a -> a.contains("CDC Art. 52, § 2º")));
    }

    @Test
    @DisplayName("Baixa parcela como PAID_EARLY se paga antes do vencimento com desconto e quita dívida na última")
    void payInstallmentUpdatesStatusAndDebt() {
        UUID debtId = UUID.randomUUID();
        UUID instId = UUID.randomUUID();
        User user = User.builder().id(userId).build();

        Debt debt = Debt.builder()
                .id(debtId)
                .creditor("Microcrédito")
                .principalAmount(new BigDecimal("1000.00"))
                .monthlyInterestRate(new BigDecimal("2.0000"))
                .fixedFeesAmount(BigDecimal.ZERO)
                .totalInstallments(1)
                .installmentAmount(new BigDecimal("1050.00"))
                .firstDueDate(LocalDate.of(2026, 12, 1))
                .status(DebtStatus.ACTIVE)
                .user(user)
                .installments(new ArrayList<>())
                .build();

        DebtInstallment inst = DebtInstallment.builder()
                .id(instId)
                .debt(debt)
                .installmentNumber(1)
                .dueDate(LocalDate.of(2026, 12, 1))
                .amount(new BigDecimal("1050.00"))
                .status(InstallmentStatus.PENDING)
                .build();
        debt.addInstallment(inst);

        when(debtInstallmentRepository.findByIdAndDebtUserId(instId, userId)).thenReturn(Optional.of(inst));
        when(debtInstallmentRepository.save(any(DebtInstallment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PayInstallmentRequest payReq = PayInstallmentRequest.builder()
                .paidAmount(new BigDecimal("1020.00"))
                .paymentDate(LocalDate.of(2026, 11, 15))
                .notes("Liquidação antecipada com desconto")
                .build();

        DebtInstallmentResponse resp = debtService.payInstallment(userId, instId, payReq);

        assertEquals(InstallmentStatus.PAID_EARLY, resp.getStatus());
        assertEquals(new BigDecimal("1020.00"), resp.getPaidAmount());
        assertEquals(LocalDate.of(2026, 11, 15), resp.getPaidAt());

        // Como era a única parcela, a dívida foi para PAID_OFF
        assertEquals(DebtStatus.PAID_OFF, debt.getStatus());
        verify(debtRepository).save(debt);
    }

    @Test
    @DisplayName("Impede baixar parcela já baixada anteriormente")
    void rejectPayingAlreadyPaidInstallment() {
        UUID instId = UUID.randomUUID();
        Debt debt = Debt.builder().id(UUID.randomUUID()).totalInstallments(1).build();
        DebtInstallment inst = DebtInstallment.builder()
                .id(instId)
                .debt(debt)
                .installmentNumber(1)
                .status(InstallmentStatus.PAID)
                .build();

        when(debtInstallmentRepository.findByIdAndDebtUserId(instId, userId)).thenReturn(Optional.of(inst));

        assertThrows(InvalidRequestException.class, () -> debtService.payInstallment(userId, instId, new PayInstallmentRequest()));
    }

    @Test
    @DisplayName("Impede acesso à dívida de outro usuário")
    void foreignUserDebtIsolation() {
        UUID otherDebtId = UUID.randomUUID();
        when(debtRepository.findByIdAndUserId(otherDebtId, userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> debtService.get(userId, otherDebtId));
        assertThrows(ResourceNotFoundException.class, () -> debtService.simulatePayoff(userId, otherDebtId, null));
    }

    @Test
    @DisplayName("Calcula resumo geral e identifica credor com maior taxa de juros")
    void calculatesSummaryWithHighestRateCreditor() {
        User user = User.builder().id(userId).build();

        Debt d1 = Debt.builder()
                .id(UUID.randomUUID())
                .creditor("Banco A (Cartão)")
                .principalAmount(new BigDecimal("2000.00"))
                .monthlyInterestRate(new BigDecimal("12.5000"))
                .fixedFeesAmount(BigDecimal.ZERO)
                .totalInstallments(2)
                .installmentAmount(new BigDecimal("1200.00"))
                .status(DebtStatus.ACTIVE)
                .user(user)
                .installments(new ArrayList<>())
                .build();

        DebtInstallment i1 = DebtInstallment.builder().id(UUID.randomUUID()).debt(d1).installmentNumber(1).dueDate(LocalDate.now()).amount(new BigDecimal("1200.00")).status(InstallmentStatus.PENDING).build();
        d1.addInstallment(i1);

        Debt d2 = Debt.builder()
                .id(UUID.randomUUID())
                .creditor("Pronampe")
                .principalAmount(new BigDecimal("10000.00"))
                .monthlyInterestRate(new BigDecimal("1.5000"))
                .fixedFeesAmount(BigDecimal.ZERO)
                .totalInstallments(10)
                .installmentAmount(new BigDecimal("1100.00"))
                .status(DebtStatus.ACTIVE)
                .user(user)
                .installments(new ArrayList<>())
                .build();

        DebtInstallment i2 = DebtInstallment.builder().id(UUID.randomUUID()).debt(d2).installmentNumber(1).dueDate(LocalDate.now()).amount(new BigDecimal("1100.00")).status(InstallmentStatus.PENDING).build();
        d2.addInstallment(i2);

        when(debtRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, DebtStatus.ACTIVE)).thenReturn(List.of(d1, d2));

        DebtSummaryResponse summary = debtService.getSummary(userId);

        assertEquals(2, summary.getActiveDebtsCount());
        assertEquals("Banco A (Cartão)", summary.getHighestRateCreditor());
        assertEquals(new BigDecimal("2300.00"), summary.getTotalOutstandingBalance());
        assertEquals(new BigDecimal("2300.00"), summary.getTotalMonthlyCommitment());
    }

    @ParameterizedTest(name = "R$ {0} a {1}% em {2}x = R$ {3}")
    @CsvSource({
            "100.05, 10, 1, 110.06",
            "10000.00, 2.5, 12, 974.87",
            "1500.00, 0, 4, 375.00"
    })
    @DisplayName("Calcula parcela pela Tabela Price em BigDecimal com arredondamento HALF_UP só no final")
    void calculatePmtRoundsHalfUpWithoutFloatingPointError(String principal, String rate, int installments, String expected) {
        assertEquals(new BigDecimal(expected),
                DebtService.calculatePmt(new BigDecimal(principal), new BigDecimal(rate), installments));
    }
}
