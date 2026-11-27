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
import com.example.margemAI.repository.AccountMovementRepository;
import com.example.margemAI.repository.BusinessAccountRepository;
import com.example.margemAI.repository.FinancialReserveRepository;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.ReserveMovementRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinancialReserveService {

    private static final BigDecimal MIN_TARGET_AMOUNT = new BigDecimal("0.01");

    private final FinancialReserveRepository reserveRepository;
    private final ReserveMovementRepository movementRepository;
    private final FixedCostRepository fixedCostRepository;
    private final BusinessAccountRepository businessAccountRepository;
    private final AccountMovementRepository accountMovementRepository;
    private final UserRepository userRepository;

    public FinancialReserveResponse getSummary(UUID userId) {
        FinancialReserve reserve = reserveRepository.findByUserId(userId)
                .orElseGet(() -> FinancialReserve.builder()
                        .goalMode(GoalMode.FIXED_AMOUNT)
                        .targetAmount(Money.ZERO)
                        .targetMonths(0)
                        .currentBalance(Money.ZERO)
                        .build());
        return buildSummaryResponse(userId, reserve);
    }

    @Transactional
    public FinancialReserveResponse updateGoal(UUID userId, ReserveGoalRequest request) {
        FinancialReserve reserve = getOrCreate(userId);

        if (request.goalMode() == GoalMode.FIXED_AMOUNT) {
            if (request.targetAmount() == null || request.targetAmount().compareTo(MIN_TARGET_AMOUNT) < 0) {
                throw new InvalidRequestException("Informe um valor de meta em reais maior que zero.");
            }
            reserve.setGoalMode(GoalMode.FIXED_AMOUNT);
            reserve.setTargetAmount(Money.round(request.targetAmount()));
            if (request.targetMonths() != null) {
                reserve.setTargetMonths(request.targetMonths());
            }
        } else {
            if (request.targetMonths() == null || request.targetMonths() < 1) {
                throw new InvalidRequestException("Informe uma quantidade de meses maior ou igual a 1.");
            }
            reserve.setGoalMode(GoalMode.MONTHS_OF_COSTS);
            reserve.setTargetMonths(request.targetMonths());
            if (request.targetAmount() != null) {
                reserve.setTargetAmount(Money.round(request.targetAmount()));
            }
        }

        FinancialReserve saved = reserveRepository.save(reserve);
        return buildSummaryResponse(userId, saved);
    }

    @Transactional
    public ReserveMovementResponse createMovement(UUID userId, ReserveMovementRequest request) {
        FinancialReserve reserve = getOrCreate(userId);
        BusinessAccount businessAccount = null;
        if (request.businessAccountId() != null) {
            businessAccount = businessAccountRepository.findByIdAndUserId(request.businessAccountId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Conta empresarial não encontrada."));
        }

        BigDecimal amount = Money.round(request.amount());
        BigDecimal currentBalance = reserve.getCurrentBalance() != null ? reserve.getCurrentBalance() : Money.ZERO;

        if (request.type() == ReserveMovement.Type.WITHDRAWAL) {
            if (amount.compareTo(currentBalance) > 0) {
                throw new InvalidRequestException("Saldo insuficiente na reserva financeira para realizar este resgate.");
            }
            currentBalance = Money.round(currentBalance.subtract(amount));
        } else {
            currentBalance = Money.round(currentBalance.add(amount));
        }

        reserve.setCurrentBalance(currentBalance);
        reserveRepository.save(reserve);

        // Internal patrimonial transfer only; never posts to Sale or alters MEI cap / DRE.
        ReserveMovement saved = movementRepository.save(ReserveMovement.builder()
                .reserve(reserve)
                .businessAccount(businessAccount)
                .type(request.type())
                .amount(amount)
                .description(request.description().trim())
                .occurredAt(request.occurredAt())
                .build());

        return toMovementResponse(saved, currentBalance);
    }

    private FinancialReserve getOrCreate(UUID userId) {
        return reserveRepository.findByUserId(userId)
                .orElseGet(() -> FinancialReserve.builder()
                        .user(userRepository.getReferenceById(userId))
                        .goalMode(GoalMode.FIXED_AMOUNT)
                        .targetAmount(Money.ZERO)
                        .targetMonths(0)
                        .currentBalance(Money.ZERO)
                        .build());
    }

    private FinancialReserveResponse buildSummaryResponse(UUID userId, FinancialReserve reserve) {
        BigDecimal rawFixedCosts = fixedCostRepository.sumActiveAmountByUserId(userId);
        BigDecimal monthlyFixedCosts = rawFixedCosts != null ? Money.round(rawFixedCosts) : Money.ZERO;

        GoalMode mode = reserve.getGoalMode() != null ? reserve.getGoalMode() : GoalMode.FIXED_AMOUNT;
        BigDecimal targetAmount = reserve.getTargetAmount() != null ? Money.round(reserve.getTargetAmount()) : Money.ZERO;
        int targetMonths = reserve.getTargetMonths() != null ? reserve.getTargetMonths() : 0;

        boolean missingFixedCosts = mode == GoalMode.MONTHS_OF_COSTS && monthlyFixedCosts.compareTo(BigDecimal.ZERO) <= 0;
        BigDecimal effectiveTargetAmount = mode == GoalMode.MONTHS_OF_COSTS
                ? Money.round(monthlyFixedCosts.multiply(BigDecimal.valueOf(targetMonths)))
                : targetAmount;

        BigDecimal reservedBalance = reserve.getCurrentBalance() != null ? Money.round(reserve.getCurrentBalance()) : Money.ZERO;
        BigDecimal totalBusinessAccountsBalance = calculateTotalBusinessAccountsBalance(userId);
        BigDecimal freeBalance = Money.round(totalBusinessAccountsBalance.subtract(reservedBalance).max(Money.ZERO));

        BigDecimal progressPercent = effectiveTargetAmount.compareTo(BigDecimal.ZERO) > 0
                ? Money.percentageOf(reservedBalance, effectiveTargetAmount)
                : Money.ZERO;

        String guidanceMessage = resolveGuidanceMessage(mode, effectiveTargetAmount, missingFixedCosts, progressPercent);

        List<ReserveMovementResponse> movements = movementRepository.findOwned(userId).stream()
                .map(m -> toMovementResponse(m, null))
                .toList();

        return new FinancialReserveResponse(
                mode,
                targetAmount,
                targetMonths,
                monthlyFixedCosts,
                effectiveTargetAmount,
                missingFixedCosts,
                guidanceMessage,
                reservedBalance,
                reservedBalance,
                totalBusinessAccountsBalance,
                freeBalance,
                progressPercent,
                movements
        );
    }

    private String resolveGuidanceMessage(
            GoalMode mode,
            BigDecimal effectiveTargetAmount,
            boolean missingFixedCosts,
            BigDecimal progressPercent
    ) {
        if (missingFixedCosts) {
            return "Faltam custos fixos ativos cadastrados para dimensionar a meta em meses de operação.";
        }
        if (effectiveTargetAmount.compareTo(BigDecimal.ZERO) <= 0) {
            return "Defina uma meta em reais ou em meses de custos fixos para acompanhar sua reserva financeira.";
        }
        if (progressPercent.compareTo(BigDecimal.valueOf(100)) >= 0) {
            return "Meta atingida! Sua reserva cobre integralmente o objetivo definido.";
        }
        if (mode == GoalMode.MONTHS_OF_COSTS) {
            return "Meta calculada automaticamente a partir dos seus custos fixos mensais ativos.";
        }
        return "Acompanhe seus aportes e mantenha o saldo reservado separado do caixa livre.";
    }

    private BigDecimal calculateTotalBusinessAccountsBalance(UUID userId) {
        List<BusinessAccount> accounts = businessAccountRepository.findByUserIdOrderByName(userId);
        if (accounts == null || accounts.isEmpty()) {
            return Money.ZERO;
        }
        List<AccountMovement> accountMovements = accountMovementRepository.findOwned(userId);
        BigDecimal total = Money.ZERO;
        for (BusinessAccount account : accounts) {
            BigDecimal balance = account.getOpeningBalance() != null ? account.getOpeningBalance() : Money.ZERO;
            if (accountMovements != null) {
                for (AccountMovement movement : accountMovements) {
                    if (account.getId() != null && movement.getAccount() != null && account.getId().equals(movement.getAccount().getId())) {
                        balance = balance.add(movement.getType() == AccountMovement.Type.APORTE
                                ? movement.getAmount()
                                : movement.getAmount().negate());
                    }
                    if (account.getId() != null && movement.getDestination() != null && account.getId().equals(movement.getDestination().getId())) {
                        balance = balance.add(movement.getAmount());
                    }
                }
            }
            total = total.add(balance);
        }
        return Money.round(total);
    }

    private ReserveMovementResponse toMovementResponse(ReserveMovement movement, BigDecimal balanceAfter) {
        BusinessAccount account = movement.getBusinessAccount();
        return new ReserveMovementResponse(
                movement.getId(),
                movement.getType(),
                Money.round(movement.getAmount()),
                movement.getDescription(),
                movement.getOccurredAt(),
                account != null ? account.getId() : null,
                account != null ? account.getName() : null,
                balanceAfter
        );
    }
}
