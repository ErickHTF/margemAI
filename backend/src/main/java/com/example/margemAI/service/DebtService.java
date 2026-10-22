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
import com.example.margemAI.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DebtService {

    private final DebtRepository debtRepository;
    private final DebtInstallmentRepository debtInstallmentRepository;
    private final UserRepository userRepository;

    @Transactional
    public DebtResponse create(UUID userId, DebtRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        BigDecimal fixedFees = request.getFixedFeesAmount() != null ? Money.round(request.getFixedFeesAmount()) : Money.ZERO;
        BigDecimal principal = Money.round(request.getPrincipalAmount());
        BigDecimal rate = request.getMonthlyInterestRate();
        Integer installments = request.getTotalInstallments();

        BigDecimal installmentAmount;
        if (request.getInstallmentAmount() != null && request.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0) {
            installmentAmount = Money.round(request.getInstallmentAmount());
        } else {
            installmentAmount = calculatePmt(principal, rate, installments);
        }

        Debt debt = Debt.builder()
                .creditor(request.getCreditor().trim())
                .description(request.getDescription() != null ? request.getDescription().trim() : null)
                .principalAmount(principal)
                .monthlyInterestRate(rate)
                .fixedFeesAmount(fixedFees)
                .totalInstallments(installments)
                .installmentAmount(installmentAmount)
                .firstDueDate(request.getFirstDueDate())
                .status(DebtStatus.ACTIVE)
                .user(user)
                .installments(new ArrayList<>())
                .build();

        for (int i = 1; i <= installments; i++) {
            LocalDate dueDate = request.getFirstDueDate().plusMonths(i - 1L);
            DebtInstallment installment = DebtInstallment.builder()
                    .installmentNumber(i)
                    .dueDate(dueDate)
                    .amount(installmentAmount)
                    .status(InstallmentStatus.PENDING)
                    .debt(debt)
                    .build();
            debt.addInstallment(installment);
        }

        Debt saved = debtRepository.save(debt);
        return toDebtResponse(saved, null, true);
    }

    @Transactional(readOnly = true)
    public List<DebtResponse> list(UUID userId) {
        List<Debt> debts = debtRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return rankDebts(debts);
    }

    @Transactional(readOnly = true)
    public DebtResponse get(UUID userId, UUID debtId) {
        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida não encontrada."));
        return toDebtResponse(debt, null, true);
    }

    @Transactional
    public DebtResponse update(UUID userId, UUID debtId, DebtRequest request) {
        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida não encontrada."));

        boolean hasPaidInstallments = debt.getInstallments().stream()
                .anyMatch(i -> i.getStatus() != InstallmentStatus.PENDING);

        debt.setCreditor(request.getCreditor().trim());
        debt.setDescription(request.getDescription() != null ? request.getDescription().trim() : null);

        if (!hasPaidInstallments) {
            BigDecimal fixedFees = request.getFixedFeesAmount() != null ? Money.round(request.getFixedFeesAmount()) : Money.ZERO;
            BigDecimal principal = Money.round(request.getPrincipalAmount());
            BigDecimal rate = request.getMonthlyInterestRate();
            Integer installmentsCount = request.getTotalInstallments();

            BigDecimal installmentAmount;
            if (request.getInstallmentAmount() != null && request.getInstallmentAmount().compareTo(BigDecimal.ZERO) > 0) {
                installmentAmount = Money.round(request.getInstallmentAmount());
            } else {
                installmentAmount = calculatePmt(principal, rate, installmentsCount);
            }

            debt.setPrincipalAmount(principal);
            debt.setMonthlyInterestRate(rate);
            debt.setFixedFeesAmount(fixedFees);
            debt.setTotalInstallments(installmentsCount);
            debt.setInstallmentAmount(installmentAmount);
            debt.setFirstDueDate(request.getFirstDueDate());

            debt.getInstallments().clear();
            for (int i = 1; i <= installmentsCount; i++) {
                LocalDate dueDate = request.getFirstDueDate().plusMonths(i - 1L);
                DebtInstallment installment = DebtInstallment.builder()
                        .installmentNumber(i)
                        .dueDate(dueDate)
                        .amount(installmentAmount)
                        .status(InstallmentStatus.PENDING)
                        .debt(debt)
                        .build();
                debt.addInstallment(installment);
            }
        }

        Debt saved = debtRepository.save(debt);
        return toDebtResponse(saved, null, true);
    }

    @Transactional
    public void delete(UUID userId, UUID debtId) {
        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida não encontrada."));
        debtRepository.delete(debt);
    }

    @Transactional
    public DebtInstallmentResponse payInstallment(UUID userId, UUID installmentId, PayInstallmentRequest request) {
        DebtInstallment installment = debtInstallmentRepository.findByIdAndDebtUserId(installmentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Parcela não encontrada."));

        if (installment.getStatus() != InstallmentStatus.PENDING) {
            throw new InvalidRequestException(
                    "A parcela nº " + installment.getInstallmentNumber() + " já foi baixada com status " + installment.getStatus() + "."
            );
        }

        LocalDate paymentDate = request != null && request.getPaymentDate() != null
                ? request.getPaymentDate()
                : LocalDate.now();

        BigDecimal paidAmount = request != null && request.getPaidAmount() != null
                ? Money.round(request.getPaidAmount())
                : installment.getAmount();

        InstallmentStatus newStatus = paymentDate.isBefore(installment.getDueDate()) && paidAmount.compareTo(installment.getAmount()) < 0
                ? InstallmentStatus.PAID_EARLY
                : InstallmentStatus.PAID;

        installment.setPaidAmount(paidAmount);
        installment.setPaidAt(paymentDate);
        installment.setStatus(newStatus);
        if (request != null && request.getNotes() != null) {
            installment.setNotes(request.getNotes().trim());
        }

        DebtInstallment savedInstallment = debtInstallmentRepository.save(installment);

        Debt debt = installment.getDebt();
        boolean allSettled = debt.getInstallments().stream()
                .allMatch(i -> i.getStatus() != InstallmentStatus.PENDING);
        if (allSettled) {
            debt.setStatus(DebtStatus.PAID_OFF);
            debtRepository.save(debt);
        }

        return toInstallmentResponse(savedInstallment);
    }

    @Transactional(readOnly = true)
    public DebtPayoffSimulationResponse simulatePayoff(UUID userId, UUID debtId, DebtSimulatePayoffRequest request) {
        Debt debt = debtRepository.findByIdAndUserId(debtId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Dívida não encontrada."));

        LocalDate simulationDate = request != null && request.getSimulationDate() != null
                ? request.getSimulationDate()
                : LocalDate.now();

        BigDecimal discountRate = request != null && request.getMonthlyDiscountRate() != null
                ? request.getMonthlyDiscountRate()
                : debt.getMonthlyInterestRate();

        List<DebtInstallment> pending = debt.getInstallments().stream()
                .filter(i -> i.getStatus() == InstallmentStatus.PENDING)
                .sorted(Comparator.comparing(DebtInstallment::getInstallmentNumber))
                .toList();

        if (pending.isEmpty()) {
            throw new InvalidRequestException("Esta dívida já está quitada ou não possui parcelas vincendas para antecipação.");
        }

        List<DebtInstallment> selectedInstallments = new ArrayList<>();
        if (request != null && request.getInstallmentsToAnticipate() != null) {
            int toTake = Math.min(request.getInstallmentsToAnticipate(), pending.size());
            int startIndex = pending.size() - toTake;
            for (int i = startIndex; i < pending.size(); i++) {
                selectedInstallments.add(pending.get(i));
            }
        } else if (request != null && request.getAmortizeAmount() != null) {
            BigDecimal budget = Money.round(request.getAmortizeAmount());
            BigDecimal accumulatedPv = Money.ZERO;
            List<DebtInstallment> reversePending = new ArrayList<>(pending);
            Collections.reverse(reversePending);

            for (DebtInstallment inst : reversePending) {
                BigDecimal pv = calculatePresentValue(inst.getAmount(), discountRate, simulationDate, inst.getDueDate());
                if (accumulatedPv.add(pv).compareTo(budget) <= 0) {
                    accumulatedPv = accumulatedPv.add(pv);
                    selectedInstallments.add(inst);
                } else {
                    break;
                }
            }

            if (selectedInstallments.isEmpty()) {
                BigDecimal minPv = calculatePresentValue(reversePending.getFirst().getAmount(), discountRate, simulationDate, reversePending.getFirst().getDueDate());
                throw new InvalidRequestException("O valor disponível (R$ " + budget + ") é insuficiente para quitar a última parcela vincenda (R$ " + minPv + ").");
            }
            selectedInstallments.sort(Comparator.comparing(DebtInstallment::getInstallmentNumber));
        } else {
            selectedInstallments.addAll(pending);
        }

        BigDecimal originalTotal = Money.ZERO;
        BigDecimal payoffTotal = Money.ZERO;
        List<Integer> simulatedNumbers = new ArrayList<>();

        for (DebtInstallment inst : selectedInstallments) {
            BigDecimal pv = calculatePresentValue(inst.getAmount(), discountRate, simulationDate, inst.getDueDate());
            originalTotal = originalTotal.add(inst.getAmount());
            payoffTotal = payoffTotal.add(pv);
            simulatedNumbers.add(inst.getInstallmentNumber());
        }

        originalTotal = Money.round(originalTotal);
        payoffTotal = Money.round(payoffTotal);
        BigDecimal estimatedSavings = Money.round(originalTotal.subtract(payoffTotal));
        BigDecimal savingsPercent = originalTotal.compareTo(BigDecimal.ZERO) > 0
                ? Money.percentageOf(estimatedSavings, originalTotal)
                : Money.ZERO;

        List<String> assumptions = List.of(
                "Desconto proporcional de juros calculado conforme CDC Art. 52, § 2º e Resolução CMN.",
                "Taxa de desconto aplicada: " + discountRate.stripTrailingZeros().toPlainString() + "% ao mês sobre " + simulatedNumbers.size() + " parcela(s) vincenda(s).",
                "Data-base de simulação: " + simulationDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + ".",
                "Parcelas descontadas a valor presente trazendo primeiro as últimas do contrato (ordem inversa), maximizando o abatimento de juros futuros.",
                "Tarifas contratuais fixas (TAC, tarifas administrativas e IOF contratual) já amortizadas na liberação do crédito não sofrem estorno.",
                "O valor final exato para quitação deve ser confirmado junto à instituição credora por meio de boleto ou extrato oficial de liquidação antecipada."
        );

        return DebtPayoffSimulationResponse.builder()
                .debtId(debt.getId())
                .creditor(debt.getCreditor())
                .simulationDate(simulationDate)
                .discountRateMonthly(discountRate)
                .installmentsCount(simulatedNumbers.size())
                .simulatedInstallmentNumbers(simulatedNumbers)
                .originalTotalAmount(originalTotal)
                .payoffAmount(payoffTotal)
                .estimatedSavings(estimatedSavings)
                .savingsPercent(savingsPercent)
                .assumptions(assumptions)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DebtInstallmentResponse> getSchedule(UUID userId, InstallmentStatus status, LocalDate startDate, LocalDate endDate) {
        List<DebtInstallment> installments = debtInstallmentRepository.findSchedule(userId, status, startDate, endDate);
        return installments.stream().map(this::toInstallmentResponse).toList();
    }

    @Transactional(readOnly = true)
    public DebtSummaryResponse getSummary(UUID userId) {
        List<Debt> activeDebts = debtRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, DebtStatus.ACTIVE);

        BigDecimal totalOutstanding = Money.ZERO;
        BigDecimal totalMonthlyCommitment = Money.ZERO;
        BigDecimal totalEstimatedInterest = Money.ZERO;
        int totalPendingInstallments = 0;
        String highestRateCreditor = null;
        BigDecimal maxRate = BigDecimal.valueOf(-1);

        YearMonth currentMonth = YearMonth.now();

        for (Debt debt : activeDebts) {
            BigDecimal pendingSum = Money.ZERO;
            for (DebtInstallment inst : debt.getInstallments()) {
                if (inst.getStatus() == InstallmentStatus.PENDING) {
                    pendingSum = pendingSum.add(inst.getAmount());
                    totalPendingInstallments++;
                    if (YearMonth.from(inst.getDueDate()).equals(currentMonth)) {
                        totalMonthlyCommitment = totalMonthlyCommitment.add(inst.getAmount());
                    }
                }
            }
            totalOutstanding = totalOutstanding.add(pendingSum);

            BigDecimal contractedTotal = debt.getInstallmentAmount()
                    .multiply(BigDecimal.valueOf(debt.getTotalInstallments()))
                    .add(debt.getFixedFeesAmount() != null ? debt.getFixedFeesAmount() : Money.ZERO);
            BigDecimal interest = contractedTotal.subtract(debt.getPrincipalAmount());
            if (interest.compareTo(BigDecimal.ZERO) > 0) {
                totalEstimatedInterest = totalEstimatedInterest.add(interest);
            }

            if (debt.getMonthlyInterestRate().compareTo(maxRate) > 0) {
                maxRate = debt.getMonthlyInterestRate();
                highestRateCreditor = debt.getCreditor();
            }
        }

        return DebtSummaryResponse.builder()
                .totalOutstandingBalance(Money.round(totalOutstanding))
                .totalMonthlyCommitment(Money.round(totalMonthlyCommitment))
                .totalEstimatedInterest(Money.round(totalEstimatedInterest))
                .activeDebtsCount(activeDebts.size())
                .pendingInstallmentsCount(totalPendingInstallments)
                .highestRateCreditor(highestRateCreditor)
                .build();
    }

    public static BigDecimal calculatePmt(BigDecimal principal, BigDecimal monthlyRatePercent, int n) {
        if (monthlyRatePercent == null || monthlyRatePercent.compareTo(BigDecimal.ZERO) == 0) {
            return principal.divide(BigDecimal.valueOf(n), 2, RoundingMode.HALF_UP);
        }
        double p = principal.doubleValue();
        double i = monthlyRatePercent.doubleValue() / 100.0;
        double pmt = p * (i * Math.pow(1.0 + i, n)) / (Math.pow(1.0 + i, n) - 1.0);
        return Money.round(BigDecimal.valueOf(pmt));
    }

    public static BigDecimal calculatePresentValue(BigDecimal amount, BigDecimal monthlyRatePercent, LocalDate fromDate, LocalDate dueDate) {
        if (dueDate.isBefore(fromDate) || dueDate.isEqual(fromDate) || monthlyRatePercent == null || monthlyRatePercent.compareTo(BigDecimal.ZERO) <= 0) {
            return Money.round(amount);
        }
        long days = ChronoUnit.DAYS.between(fromDate, dueDate);
        if (days <= 0) {
            return Money.round(amount);
        }
        double rate = monthlyRatePercent.doubleValue() / 100.0;
        double months = days / 30.0;
        double factor = Math.pow(1.0 + rate, months);
        if (factor <= 0.0 || Double.isNaN(factor) || Double.isInfinite(factor)) {
            return Money.round(amount);
        }
        return Money.round(amount.divide(BigDecimal.valueOf(factor), 4, RoundingMode.HALF_UP));
    }

    private List<DebtResponse> rankDebts(List<Debt> debts) {
        List<Debt> active = debts.stream()
                .filter(d -> d.getStatus() == DebtStatus.ACTIVE)
                .sorted(Comparator.comparing(Debt::getMonthlyInterestRate, Comparator.reverseOrder())
                        .thenComparing(Debt::getPrincipalAmount, Comparator.reverseOrder()))
                .toList();

        List<DebtResponse> responses = new ArrayList<>();
        int rank = 1;
        for (Debt d : active) {
            responses.add(toDebtResponse(d, rank++, false));
        }

        List<Debt> paidOff = debts.stream()
                .filter(d -> d.getStatus() != DebtStatus.ACTIVE)
                .toList();
        for (Debt d : paidOff) {
            responses.add(toDebtResponse(d, null, false));
        }

        return responses;
    }

    private DebtResponse toDebtResponse(Debt debt, Integer priorityRank, boolean includeInstallments) {
        BigDecimal totalContracted = debt.getInstallmentAmount()
                .multiply(BigDecimal.valueOf(debt.getTotalInstallments()))
                .add(debt.getFixedFeesAmount() != null ? debt.getFixedFeesAmount() : Money.ZERO);
        totalContracted = Money.round(totalContracted);

        BigDecimal totalInterestAndFees = Money.round(totalContracted.subtract(debt.getPrincipalAmount()));
        BigDecimal multiple = debt.getPrincipalAmount().compareTo(BigDecimal.ZERO) > 0
                ? totalContracted.divide(debt.getPrincipalAmount(), 4, RoundingMode.HALF_UP)
                : BigDecimal.ONE.setScale(4, RoundingMode.HALF_UP);
        BigDecimal effectivePercent = debt.getPrincipalAmount().compareTo(BigDecimal.ZERO) > 0
                ? Money.percentageOf(totalInterestAndFees, debt.getPrincipalAmount())
                : Money.ZERO;

        BigDecimal remainingBalance = Money.ZERO;
        BigDecimal paidTotal = Money.ZERO;
        int remainingCount = 0;
        int paidCount = 0;

        List<DebtInstallmentResponse> installmentResponses = null;
        if (includeInstallments && debt.getInstallments() != null) {
            installmentResponses = new ArrayList<>();
        }

        if (debt.getInstallments() != null) {
            for (DebtInstallment inst : debt.getInstallments()) {
                if (inst.getStatus() == InstallmentStatus.PENDING) {
                    remainingBalance = remainingBalance.add(inst.getAmount());
                    remainingCount++;
                } else {
                    BigDecimal paid = inst.getPaidAmount() != null ? inst.getPaidAmount() : inst.getAmount();
                    paidTotal = paidTotal.add(paid);
                    paidCount++;
                }
                if (installmentResponses != null) {
                    installmentResponses.add(toInstallmentResponse(inst));
                }
            }
        }

        return DebtResponse.builder()
                .id(debt.getId())
                .creditor(debt.getCreditor())
                .description(debt.getDescription())
                .principalAmount(debt.getPrincipalAmount())
                .monthlyInterestRate(debt.getMonthlyInterestRate())
                .fixedFeesAmount(debt.getFixedFeesAmount())
                .totalInstallments(debt.getTotalInstallments())
                .installmentAmount(debt.getInstallmentAmount())
                .firstDueDate(debt.getFirstDueDate())
                .status(debt.getStatus())
                .totalContractedCost(totalContracted)
                .totalInterestAndFees(totalInterestAndFees)
                .effectiveCostMultiple(multiple)
                .effectiveCostPercent(effectivePercent)
                .remainingBalance(Money.round(remainingBalance))
                .paidAmountTotal(Money.round(paidTotal))
                .remainingInstallments(remainingCount)
                .paidInstallments(paidCount)
                .priorityRank(priorityRank)
                .installments(installmentResponses)
                .createdAt(debt.getCreatedAt())
                .updatedAt(debt.getUpdatedAt())
                .build();
    }

    private DebtInstallmentResponse toInstallmentResponse(DebtInstallment inst) {
        boolean overdue = inst.getStatus() == InstallmentStatus.PENDING && inst.getDueDate().isBefore(LocalDate.now());
        return DebtInstallmentResponse.builder()
                .id(inst.getId())
                .debtId(inst.getDebt().getId())
                .creditor(inst.getDebt().getCreditor())
                .installmentNumber(inst.getInstallmentNumber())
                .totalInstallments(inst.getDebt().getTotalInstallments())
                .dueDate(inst.getDueDate())
                .amount(inst.getAmount())
                .paidAmount(inst.getPaidAmount())
                .paidAt(inst.getPaidAt())
                .status(inst.getStatus())
                .notes(inst.getNotes())
                .overdue(overdue)
                .createdAt(inst.getCreatedAt())
                .updatedAt(inst.getUpdatedAt())
                .build();
    }
}
