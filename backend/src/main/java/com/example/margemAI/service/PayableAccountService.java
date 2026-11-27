package com.example.margemAI.service;

import com.example.margemAI.dto.request.GenerateRecurringPayablesRequest;
import com.example.margemAI.dto.request.PayableAccountRequest;
import com.example.margemAI.dto.request.PayablePaymentRequest;
import com.example.margemAI.dto.response.PayableAccountResponse;
import com.example.margemAI.dto.response.PayableSummaryResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.PayableAccount;
import com.example.margemAI.model.PayableStatus;
import com.example.margemAI.model.PayableType;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.PayableAccountRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.util.Money;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PayableAccountService {

    private static final String NOT_FOUND_MESSAGE = "Conta a pagar não encontrada.";
    private static final String INVALID_COMPETENCY_MESSAGE = "Competência inválida. Use o formato AAAA-MM.";

    private final PayableAccountRepository payableAccountRepository;
    private final FixedCostRepository fixedCostRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PayableSummaryResponse findAll(
            UUID userId,
            String competency,
            PayableStatus status,
            String category,
            PayableType type,
            LocalDate startDate,
            LocalDate endDate
    ) {
        YearMonth parsedCompetency = parseCompetency(competency);

        Specification<PayableAccount> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));

            if (parsedCompetency != null) {
                predicates.add(cb.equal(root.get("competency"), parsedCompetency.toString()));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), category.trim()));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dueDate"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dueDate"), endDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Sort sort = Sort.by(Sort.Direction.ASC, "dueDate").and(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<PayableAccount> items = payableAccountRepository.findAll(spec, sort);

        // Summary indicators: if competency is given, compute over all accounts for that competency
        List<PayableAccount> baseForSummary;
        if (parsedCompetency != null) {
            baseForSummary = payableAccountRepository.findByUserIdAndCompetency(userId, parsedCompetency.toString());
        } else if (status != null || category != null || type != null || startDate != null || endDate != null) {
            baseForSummary = items;
        } else {
            baseForSummary = payableAccountRepository.findByUserId(userId);
        }

        PayableSummaryResponse summary = computeSummary(baseForSummary, LocalDate.now());
        summary.setItems(items.stream().map(this::toResponse).toList());
        return summary;
    }

    @Transactional(readOnly = true)
    public PayableAccountResponse findById(UUID userId, UUID id) {
        PayableAccount payable = payableAccountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        return toResponse(payable);
    }

    @Transactional
    public PayableAccountResponse create(UUID userId, PayableAccountRequest request) {
        String competencyStr;
        if (request.getCompetency() != null && !request.getCompetency().isBlank()) {
            YearMonth parsed = parseCompetency(request.getCompetency());
            competencyStr = parsed.toString();
        } else {
            competencyStr = YearMonth.from(request.getDueDate()).toString();
        }

        PayableAccount payable = PayableAccount.builder()
                .user(userRepository.getReferenceById(userId))
                .type(request.getType() != null ? request.getType() : PayableType.ONE_OFF)
                .fixedCostId(request.getFixedCostId())
                .competency(competencyStr)
                .description(request.getDescription().trim())
                .category(request.getCategory() != null && !request.getCategory().isBlank()
                        ? request.getCategory().trim()
                        : "OUTRO")
                .dueDate(request.getDueDate())
                .totalAmount(Money.round(request.getTotalAmount()))
                .paidAmount(Money.ZERO)
                .status(PayableStatus.PENDING)
                .notes(request.getNotes())
                .build();

        PayableAccount saved = payableAccountRepository.save(payable);
        return toResponse(saved);
    }

    @Transactional
    public PayableAccountResponse update(UUID userId, UUID id, PayableAccountRequest request) {
        PayableAccount payable = payableAccountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));

        BigDecimal newTotal = Money.round(request.getTotalAmount());
        if (newTotal.compareTo(payable.getPaidAmount()) < 0) {
            throw new InvalidRequestException(
                    "O valor total não pode ser menor que o valor já pago (R$ " + payable.getPaidAmount() + ")."
            );
        }

        if (request.getCompetency() != null && !request.getCompetency().isBlank()) {
            YearMonth parsed = parseCompetency(request.getCompetency());
            payable.setCompetency(parsed.toString());
        }

        payable.setDescription(request.getDescription().trim());
        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            payable.setCategory(request.getCategory().trim());
        }
        payable.setDueDate(request.getDueDate());
        payable.setTotalAmount(newTotal);
        if (request.getNotes() != null) {
            payable.setNotes(request.getNotes());
        }

        // Recalculate status based on newTotal vs paidAmount
        if (payable.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
            if (payable.getPaidAmount().compareTo(newTotal) >= 0) {
                payable.setStatus(PayableStatus.PAID);
            } else {
                payable.setStatus(PayableStatus.PARTIAL);
            }
        } else if (payable.getStatus() != PayableStatus.REVERSED) {
            payable.setStatus(PayableStatus.PENDING);
        }

        return toResponse(payable);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        PayableAccount payable = payableAccountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        payableAccountRepository.delete(payable);
    }

    @Transactional
    public PayableAccountResponse pay(UUID userId, UUID id, PayablePaymentRequest request) {
        PayableAccount payable = payableAccountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));

        BigDecimal paymentAmount = Money.round(request.getAmount());
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("O valor do pagamento deve ser maior que zero.");
        }

        BigDecimal remaining = payable.getTotalAmount().subtract(payable.getPaidAmount());
        if (paymentAmount.compareTo(remaining) > 0) {
            throw new InvalidRequestException(
                    "O valor do pagamento não pode ser maior que o saldo em aberto (R$ " + remaining + ")."
            );
        }

        BigDecimal newPaidAmount = Money.round(payable.getPaidAmount().add(paymentAmount));
        payable.setPaidAmount(newPaidAmount);

        if (newPaidAmount.compareTo(payable.getTotalAmount()) >= 0) {
            payable.setStatus(PayableStatus.PAID);
        } else {
            payable.setStatus(PayableStatus.PARTIAL);
        }

        payable.setPaidAt(request.getPaidAt() != null ? request.getPaidAt() : LocalDateTime.now());

        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            String note = request.getNotes().trim();
            payable.setNotes(payable.getNotes() != null && !payable.getNotes().isBlank()
                    ? payable.getNotes() + " | " + note
                    : note);
        }

        return toResponse(payable);
    }

    @Transactional
    public PayableAccountResponse reverse(UUID userId, UUID id) {
        PayableAccount payable = payableAccountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));

        if (payable.getPaidAmount().compareTo(BigDecimal.ZERO) <= 0 && payable.getStatus() == PayableStatus.PENDING) {
            throw new InvalidRequestException("Não há pagamento registrado para ser estornado.");
        }

        BigDecimal previousPaid = payable.getPaidAmount();
        payable.setPaidAmount(Money.ZERO);
        payable.setStatus(PayableStatus.PENDING);
        payable.setPaidAt(null);

        String auditNote = "[Estorno de R$ " + previousPaid + " em " + LocalDate.now() + "]";
        payable.setNotes(payable.getNotes() != null && !payable.getNotes().isBlank()
                ? payable.getNotes() + " | " + auditNote
                : auditNote);

        return toResponse(payable);
    }

    @Transactional
    public List<PayableAccountResponse> generateRecurring(UUID userId, GenerateRecurringPayablesRequest request) {
        YearMonth ym = parseCompetency(request.getCompetency());
        List<FixedCost> fixedCosts = fixedCostRepository.findByUserId(userId);
        List<PayableAccount> createdList = new ArrayList<>();

        for (FixedCost fixedCost : fixedCosts) {
            if (!Boolean.TRUE.equals(fixedCost.getRecurring())) {
                continue;
            }
            BigDecimal amount = fixedCost.amountForMonth(ym);
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            // Strict idempotency: skip if already generated for (userId, fixedCostId, competency)
            if (payableAccountRepository.existsByUserIdAndFixedCostIdAndCompetency(userId, fixedCost.getId(), ym.toString())) {
                continue;
            }

            int day = 10;
            if (fixedCost.getDueDate() != null) {
                day = fixedCost.getDueDate().getDayOfMonth();
            } else if (request.getEffectiveDueDay() != null) {
                day = request.getEffectiveDueDay();
            }
            int maxDay = ym.lengthOfMonth();
            int resolvedDay = Math.min(day, maxDay);
            LocalDate dueDate = ym.atDay(resolvedDay);

            PayableAccount payable = PayableAccount.builder()
                    .user(userRepository.getReferenceById(userId))
                    .type(PayableType.RECURRING)
                    .fixedCostId(fixedCost.getId())
                    .competency(ym.toString())
                    .description(fixedCost.getName())
                    .category(fixedCost.getCategory() != null ? fixedCost.getCategory().name() : "OUTRO")
                    .dueDate(dueDate)
                    .totalAmount(Money.round(amount))
                    .paidAmount(Money.ZERO)
                    .status(PayableStatus.PENDING)
                    .build();

            createdList.add(payableAccountRepository.save(payable));
        }

        return createdList.stream().map(this::toResponse).toList();
    }

    private PayableSummaryResponse computeSummary(List<PayableAccount> accounts, LocalDate today) {
        BigDecimal totalCommitted = BigDecimal.ZERO;
        BigDecimal totalDisbursed = BigDecimal.ZERO;
        BigDecimal totalOpen = BigDecimal.ZERO;
        BigDecimal totalOverdue = BigDecimal.ZERO;

        for (PayableAccount account : accounts) {
            if (account.getStatus() != PayableStatus.REVERSED) {
                totalCommitted = totalCommitted.add(account.getTotalAmount());
            }
            totalDisbursed = totalDisbursed.add(account.getPaidAmount());

            if (account.getStatus() != PayableStatus.PAID && account.getStatus() != PayableStatus.REVERSED) {
                BigDecimal open = account.getTotalAmount().subtract(account.getPaidAmount());
                if (open.compareTo(BigDecimal.ZERO) > 0) {
                    totalOpen = totalOpen.add(open);
                    if (account.getDueDate().isBefore(today)) {
                        totalOverdue = totalOverdue.add(open);
                    }
                }
            }
        }

        return PayableSummaryResponse.builder()
                .totalCommittedExpense(Money.round(totalCommitted))
                .totalEffectiveDisbursement(Money.round(totalDisbursed))
                .totalOpenPayable(Money.round(totalOpen))
                .totalOverduePayable(Money.round(totalOverdue))
                .build();
    }

    public PayableAccountResponse toResponse(PayableAccount account) {
        BigDecimal remaining = account.getTotalAmount().subtract(account.getPaidAmount());
        if (remaining.compareTo(BigDecimal.ZERO) < 0) {
            remaining = Money.ZERO;
        }
        boolean isOverdue = account.getDueDate().isBefore(LocalDate.now())
                && account.getStatus() != PayableStatus.PAID
                && account.getStatus() != PayableStatus.REVERSED;

        return PayableAccountResponse.builder()
                .id(account.getId())
                .userId(account.getUser() != null ? account.getUser().getId() : null)
                .type(account.getType())
                .fixedCostId(account.getFixedCostId())
                .competency(account.getCompetency())
                .description(account.getDescription())
                .category(account.getCategory())
                .dueDate(account.getDueDate())
                .totalAmount(account.getTotalAmount())
                .paidAmount(account.getPaidAmount())
                .remainingAmount(Money.round(remaining))
                .status(account.getStatus())
                .paidAt(account.getPaidAt())
                .notes(account.getNotes())
                .overdue(isOverdue)
                .createdAt(account.getCreatedAt())
                .updatedAt(account.getUpdatedAt())
                .build();
    }

    private YearMonth parseCompetency(String competency) {
        if (competency == null || competency.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(competency.trim());
        } catch (DateTimeParseException ex) {
            throw new InvalidRequestException(INVALID_COMPETENCY_MESSAGE);
        }
    }
}
