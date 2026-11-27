package com.example.margemAI.service;

import com.example.margemAI.dto.request.ReserveGoalRequest;
import com.example.margemAI.dto.request.ReserveMovementRequest;
import com.example.margemAI.dto.response.FinancialReserveResponse;
import com.example.margemAI.dto.response.ReserveMovementResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.AccountMovement;
import com.example.margemAI.model.BusinessAccount;
import com.example.margemAI.model.FinancialReserve;
import com.example.margemAI.model.FinancialReserve.GoalMode;
import com.example.margemAI.model.ReserveMovement;
import com.example.margemAI.model.ReserveMovement.Type;
import com.example.margemAI.repository.AccountMovementRepository;
import com.example.margemAI.repository.BusinessAccountRepository;
import com.example.margemAI.repository.FinancialReserveRepository;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.ReserveMovementRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FinancialReserveServiceTest {

    @Mock
    FinancialReserveRepository reserveRepository;

    @Mock
    ReserveMovementRepository movementRepository;

    @Mock
    FixedCostRepository fixedCostRepository;

    @Mock
    BusinessAccountRepository businessAccountRepository;

    @Mock
    AccountMovementRepository accountMovementRepository;

    @Mock
    UserRepository userRepository;

    @InjectMocks
    FinancialReserveService service;

    private final UUID userId = UUID.randomUUID();

    @Test
    @DisplayName("Calcula progresso da meta em reais e separa saldo reservado do saldo livre das contas")
    void fixedAmountSummaryAndFreeBalance() {
        FinancialReserve reserve = FinancialReserve.builder()
                .id(UUID.randomUUID())
                .goalMode(GoalMode.FIXED_AMOUNT)
                .targetAmount(new BigDecimal("4000.00"))
                .targetMonths(0)
                .currentBalance(new BigDecimal("1500.00"))
                .build();
        BusinessAccount accountA = BusinessAccount.builder()
                .id(UUID.randomUUID())
                .name("Conta PJ")
                .openingBalance(new BigDecimal("3200.00"))
                .openingDate(LocalDate.of(2026, 1, 10))
                .build();
        BusinessAccount accountB = BusinessAccount.builder()
                .id(UUID.randomUUID())
                .name("Caixa")
                .openingBalance(new BigDecimal("950.00"))
                .openingDate(LocalDate.of(2026, 1, 10))
                .build();
        AccountMovement entry = AccountMovement.builder()
                .id(UUID.randomUUID())
                .account(accountA)
                .type(AccountMovement.Type.APORTE)
                .amount(new BigDecimal("350.00"))
                .date(LocalDate.of(2026, 2, 1))
                .description("Entrada")
                .build();

        when(reserveRepository.findByUserId(userId)).thenReturn(Optional.of(reserve));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("1200.00"));
        when(businessAccountRepository.findByUserIdOrderByName(userId)).thenReturn(List.of(accountA, accountB));
        when(accountMovementRepository.findOwned(userId)).thenReturn(List.of(entry));
        when(movementRepository.findOwned(userId)).thenReturn(List.of());

        FinancialReserveResponse summary = service.getSummary(userId);

        assertEquals(GoalMode.FIXED_AMOUNT, summary.goalMode());
        assertEquals(new BigDecimal("4000.00"), summary.effectiveTargetAmount());
        assertEquals(new BigDecimal("1500.00"), summary.reservedBalance());
        assertEquals(new BigDecimal("4500.00"), summary.totalBusinessAccountsBalance());
        assertEquals(new BigDecimal("3000.00"), summary.freeBalance());
        assertEquals(new BigDecimal("37.50"), summary.progressPercent());
        assertFalse(summary.missingFixedCostsForMonthsGoal());
    }

    @Test
    @DisplayName("Dimensiona meta em meses multiplicando pelos custos fixos ativos do titular")
    void monthsOfCostsGoalCalculation() {
        FinancialReserve existing = FinancialReserve.builder()
                .id(UUID.randomUUID())
                .goalMode(GoalMode.FIXED_AMOUNT)
                .targetAmount(new BigDecimal("1000.00"))
                .targetMonths(0)
                .currentBalance(new BigDecimal("1350.00"))
                .build();

        when(reserveRepository.findByUserId(userId)).thenReturn(Optional.of(existing));
        when(reserveRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("1800.00"));
        when(businessAccountRepository.findByUserIdOrderByName(userId)).thenReturn(List.of());
        when(movementRepository.findOwned(userId)).thenReturn(List.of());

        FinancialReserveResponse updated = service.updateGoal(
                userId,
                new ReserveGoalRequest(GoalMode.MONTHS_OF_COSTS, null, 3)
        );

        assertEquals(GoalMode.MONTHS_OF_COSTS, updated.goalMode());
        assertEquals(3, updated.targetMonths());
        assertEquals(new BigDecimal("1800.00"), updated.monthlyFixedCosts());
        assertEquals(new BigDecimal("5400.00"), updated.effectiveTargetAmount());
        assertEquals(new BigDecimal("25.00"), updated.progressPercent());
        assertFalse(updated.missingFixedCostsForMonthsGoal());
    }

    @Test
    @DisplayName("Indica ausência de custos fixos quando a meta está em meses e o total de custos fixos é zero")
    void monthsOfCostsWithoutFixedCosts() {
        FinancialReserve existing = FinancialReserve.builder()
                .id(UUID.randomUUID())
                .goalMode(GoalMode.MONTHS_OF_COSTS)
                .targetAmount(BigDecimal.ZERO)
                .targetMonths(4)
                .currentBalance(new BigDecimal("500.00"))
                .build();

        when(reserveRepository.findByUserId(userId)).thenReturn(Optional.of(existing));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(BigDecimal.ZERO);
        when(businessAccountRepository.findByUserIdOrderByName(userId)).thenReturn(List.of());
        when(movementRepository.findOwned(userId)).thenReturn(List.of());

        FinancialReserveResponse summary = service.getSummary(userId);

        assertTrue(summary.missingFixedCostsForMonthsGoal());
        assertEquals(new BigDecimal("0.00"), summary.effectiveTargetAmount());
        assertEquals(new BigDecimal("0.00"), summary.progressPercent());
        assertTrue(summary.guidanceMessage().toLowerCase().contains("custos fixos"));
    }

    @Test
    @DisplayName("Registra aporte e resgate atualizando o saldo reservado")
    void depositAndWithdrawalUpdateReserveBalance() {
        FinancialReserve reserve = FinancialReserve.builder()
                .id(UUID.randomUUID())
                .goalMode(GoalMode.FIXED_AMOUNT)
                .targetAmount(new BigDecimal("2500.00"))
                .targetMonths(0)
                .currentBalance(new BigDecimal("600.00"))
                .build();
        BusinessAccount account = BusinessAccount.builder()
                .id(UUID.randomUUID())
                .name("Banco PJ")
                .openingBalance(new BigDecimal("2000.00"))
                .openingDate(LocalDate.of(2026, 1, 1))
                .build();

        when(reserveRepository.findByUserId(userId)).thenReturn(Optional.of(reserve));
        when(businessAccountRepository.findByIdAndUserId(account.getId(), userId)).thenReturn(Optional.of(account));
        when(reserveRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(movementRepository.save(any())).thenAnswer(i -> {
            ReserveMovement m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        ReserveMovementResponse deposit = service.createMovement(
                userId,
                new ReserveMovementRequest(Type.DEPOSIT, new BigDecimal("425.50"), "Aporte mensal", LocalDate.of(2026, 3, 5), account.getId())
        );

        assertEquals(new BigDecimal("425.50"), deposit.amount());
        assertEquals(new BigDecimal("1025.50"), deposit.balanceAfter());
        assertEquals("Banco PJ", deposit.businessAccountName());

        ReserveMovementResponse withdrawal = service.createMovement(
                userId,
                new ReserveMovementRequest(Type.WITHDRAWAL, new BigDecimal("225.50"), "Manutenção de equipamento", LocalDate.of(2026, 3, 10), null)
        );

        assertEquals(new BigDecimal("225.50"), withdrawal.amount());
        assertEquals(new BigDecimal("800.00"), withdrawal.balanceAfter());
        assertEquals(new BigDecimal("800.00"), reserve.getCurrentBalance());
    }

    @Test
    @DisplayName("Bloqueia resgate maior que o saldo atual da reserva sem gravar movimentação")
    void blocksWithdrawalAboveReserveBalance() {
        FinancialReserve reserve = FinancialReserve.builder()
                .id(UUID.randomUUID())
                .goalMode(GoalMode.FIXED_AMOUNT)
                .targetAmount(new BigDecimal("3000.00"))
                .targetMonths(0)
                .currentBalance(new BigDecimal("450.00"))
                .build();

        when(reserveRepository.findByUserId(userId)).thenReturn(Optional.of(reserve));

        ReserveMovementRequest request = new ReserveMovementRequest(
                Type.WITHDRAWAL,
                new BigDecimal("450.01"),
                "Resgate acima do saldo",
                LocalDate.of(2026, 3, 12),
                null
        );

        assertThrows(InvalidRequestException.class, () -> service.createMovement(userId, request));
        assertEquals(new BigDecimal("450.00"), reserve.getCurrentBalance());
        verifyNoInteractions(movementRepository);
    }

    @Test
    @DisplayName("Impede vincular movimentação de reserva a conta empresarial de outro titular")
    void blocksForeignBusinessAccountOnMovement() {
        FinancialReserve reserve = FinancialReserve.builder()
                .id(UUID.randomUUID())
                .currentBalance(new BigDecimal("300.00"))
                .build();
        UUID foreignAccountId = UUID.randomUUID();

        when(reserveRepository.findByUserId(userId)).thenReturn(Optional.of(reserve));
        when(businessAccountRepository.findByIdAndUserId(foreignAccountId, userId)).thenReturn(Optional.empty());

        ReserveMovementRequest request = new ReserveMovementRequest(
                Type.DEPOSIT,
                new BigDecimal("120.00"),
                "Aporte",
                LocalDate.of(2026, 3, 12),
                foreignAccountId
        );

        assertThrows(ResourceNotFoundException.class, () -> service.createMovement(userId, request));
        verify(businessAccountRepository).findByIdAndUserId(foreignAccountId, userId);
        verifyNoInteractions(movementRepository);
    }
}
