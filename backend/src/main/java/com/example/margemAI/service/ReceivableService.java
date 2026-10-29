package com.example.margemAI.service;

import com.example.margemAI.dto.request.ReceivableRequest;
import com.example.margemAI.dto.request.ReverseInstallmentRequest;
import com.example.margemAI.dto.request.SettleInstallmentRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.ReceivableInstallmentResponse;
import com.example.margemAI.dto.response.ReceivableResponse;
import com.example.margemAI.dto.response.ReceivableSummaryResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.InstallmentStatus;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import com.example.margemAI.model.Receivable;
import com.example.margemAI.model.ReceivableInstallment;
import com.example.margemAI.model.ReceivableStatus;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.ReceivableInstallmentRepository;
import com.example.margemAI.repository.ReceivableRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.util.Money;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceivableService {

    private static final String USER_NOT_FOUND_MESSAGE = "Usuário não encontrado.";
    private static final String RECEIVABLE_NOT_FOUND_MESSAGE = "Título a receber não encontrado.";
    private static final String INSTALLMENT_NOT_FOUND_MESSAGE = "Parcela não encontrada.";
    private static final String SALE_WITH_RECEIPTS_MESSAGE =
            "Esta venda já tem parcelas recebidas em Contas a Receber. Estorne os recebimentos antes de alterar "
                    + "valor, forma de pagamento, parcelas ou data da venda.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";

    private final ReceivableRepository receivableRepository;
    private final ReceivableInstallmentRepository installmentRepository;
    private final UserRepository userRepository;
    private final PaymentMethodConfigService paymentMethodConfigService;
    private final PaymentFeeCalculator paymentFeeCalculator;

    @Transactional
    public Receivable createFromSale(Sale sale) {
        if (sale == null || sale.getUser() == null) {
            return null;
        }

        Optional<Receivable> existing = receivableRepository.findBySaleIdAndUserId(sale.getId(), sale.getUser().getId());
        if (existing.isPresent()) {
            return existing.get();
        }

        return generateAndSaveReceivable(
                sale.getUser(),
                sale,
                sale.getDescription(),
                sale.getGrossAmount(),
                sale.getFeeAmount(),
                sale.getNetAmount(),
                sale.getPaymentMethod(),
                saleInstallments(sale),
                saleBaseDate(sale),
                sale.getNotes()
        );
    }

    /**
     * Reconcilia o título com a venda alterada. Sem recebimentos, as parcelas são geradas de novo;
     * com recebimentos, só descrição e observações acompanham a venda e mudanças de valor, forma de
     * pagamento, parcelas ou data são bloqueadas até o estorno, para não reescrever baixas já feitas.
     */
    @Transactional
    public Receivable syncFromSale(Sale sale) {
        if (sale == null || sale.getUser() == null) {
            return null;
        }

        Optional<Receivable> existing = receivableRepository.findBySaleIdAndUserId(sale.getId(), sale.getUser().getId());
        if (existing.isEmpty()) {
            return createFromSale(sale);
        }

        Receivable receivable = existing.get();
        int installments = saleInstallments(sale);
        LocalDate baseDate = saleBaseDate(sale);

        receivable.setDescription(sale.getDescription());
        receivable.setNotes(sale.getNotes());

        if (!financialTermsChanged(receivable, sale, installments, baseDate)) {
            return receivableRepository.save(receivable);
        }

        if (hasReceipts(receivable)) {
            throw new InvalidRequestException(SALE_WITH_RECEIPTS_MESSAGE);
        }

        receivable.setGrossAmount(sale.getGrossAmount());
        receivable.setFeeAmount(sale.getFeeAmount());
        receivable.setNetAmount(sale.getNetAmount());
        receivable.setPaymentMethod(sale.getPaymentMethod());
        receivable.setInstallments(installments);
        receivable.setIssuedAt(baseDate);
        receivable.getInstallmentList().clear();
        receivable.getInstallmentList().addAll(buildInstallments(receivable));
        receivable.recalculateTotals();

        return receivableRepository.save(receivable);
    }

    @Transactional
    public void deleteBySaleId(UUID userId, UUID saleId) {
        receivableRepository.findBySaleIdAndUserId(saleId, userId)
                .ifPresent(receivableRepository::delete);
    }

    @Transactional
    public ReceivableResponse create(UUID userId, ReceivableRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_MESSAGE));

        int installments = request.getPaymentMethod().normalizeInstallments(request.getInstallments());

        PaymentFeeCalculator.FeeCalculationResult feeResult = paymentFeeCalculator.calculate(
                userId,
                BigDecimal.ONE,
                request.getGrossAmount(),
                request.getPaymentMethod(),
                installments,
                request.getCustomFeePercentage()
        );

        LocalDate issuedAt = request.getIssuedAt() != null ? request.getIssuedAt() : LocalDate.now();

        Receivable receivable = generateAndSaveReceivable(
                user,
                null,
                request.getDescription().trim(),
                feeResult.grossAmount(),
                feeResult.feeAmount(),
                feeResult.netAmount(),
                request.getPaymentMethod(),
                installments,
                issuedAt,
                request.getNotes()
        );

        return toResponse(receivable);
    }

    @Transactional(readOnly = true)
    public ReceivableSummaryResponse findAll(
            UUID userId,
            String status,
            PaymentMethod paymentMethod,
            LocalDate startDate,
            LocalDate endDate,
            String search,
            int page,
            int size
    ) {
        validatePagination(page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "issuedAt", "createdAt"));

        Specification<Receivable> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));

            if (paymentMethod != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("issuedAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("issuedAt"), endDate));
            }
            if (search != null && !search.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("description")), "%" + search.trim().toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        List<Receivable> allFiltered = receivableRepository.findAll(spec);

        List<Receivable> statusFiltered = allFiltered;
        if (status != null && !status.isBlank()) {
            String s = status.trim().toUpperCase();
            statusFiltered = allFiltered.stream()
                    .filter(r -> r.getEffectiveStatus().name().equalsIgnoreCase(s))
                    .toList();
        }

        int fromIndex = Math.min(page * size, statusFiltered.size());
        int toIndex = Math.min(fromIndex + size, statusFiltered.size());
        List<Receivable> pagedList = statusFiltered.subList(fromIndex, toIndex);

        Page<Receivable> receivablePage = new PageImpl<>(pagedList, pageable, statusFiltered.size());
        PaginatedResponse<ReceivableResponse> paginated = PaginatedResponse.from(receivablePage, this::toResponse);

        BigDecimal totalSoldGross = allFiltered.stream()
                .map(Receivable::getGrossAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSoldNet = allFiltered.stream()
                .map(Receivable::getNetAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalReceivedEffectively = allFiltered.stream()
                .flatMap(r -> r.getInstallmentList().stream())
                .map(ReceivableInstallment::getReceivedAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPending = allFiltered.stream()
                .flatMap(r -> r.getInstallmentList().stream())
                .filter(i -> i.getStatus() != InstallmentStatus.RECEIVED && !i.isOverdue())
                .map(ReceivableInstallment::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalOverdue = allFiltered.stream()
                .flatMap(r -> r.getInstallmentList().stream())
                .filter(i -> i.getStatus() != InstallmentStatus.RECEIVED && i.isOverdue())
                .map(ReceivableInstallment::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReceivableSummaryResponse.builder()
                .totalSoldGross(Money.round(totalSoldGross))
                .totalSoldNet(Money.round(totalSoldNet))
                .totalReceivedEffectively(Money.round(totalReceivedEffectively))
                .totalPending(Money.round(totalPending))
                .totalOverdue(Money.round(totalOverdue))
                .totalCount((long) statusFiltered.size())
                .receivables(paginated)
                .build();
    }

    @Transactional(readOnly = true)
    public ReceivableResponse findById(UUID userId, UUID id) {
        Receivable receivable = receivableRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(RECEIVABLE_NOT_FOUND_MESSAGE));
        return toResponse(receivable);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Receivable receivable = receivableRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(RECEIVABLE_NOT_FOUND_MESSAGE));
        receivableRepository.delete(receivable);
    }

    @Transactional
    public ReceivableInstallmentResponse settle(UUID userId, UUID installmentId, SettleInstallmentRequest request) {
        ReceivableInstallment installment = installmentRepository.findByIdAndUserId(installmentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(INSTALLMENT_NOT_FOUND_MESSAGE));

        if (installment.getStatus() == InstallmentStatus.RECEIVED) {
            throw new InvalidRequestException("Esta parcela já foi totalmente recebida.");
        }

        BigDecimal currentReceived = installment.getReceivedAmount() != null
                ? installment.getReceivedAmount() : BigDecimal.ZERO;
        BigDecimal remaining = installment.getNetAmount().subtract(currentReceived);

        BigDecimal settleAmount;
        if (request == null || request.getAmount() == null) {
            settleAmount = remaining;
        } else {
            BigDecimal requested = Money.round(request.getAmount());
            if (requested.compareTo(BigDecimal.ZERO) <= 0) {
                throw new InvalidRequestException("O valor da baixa deve ser maior que zero.");
            }
            if (requested.compareTo(remaining) > 0) {
                throw new InvalidRequestException("O valor da baixa não pode exceder o saldo restante da parcela.");
            }
            settleAmount = requested;
        }

        BigDecimal newReceived = Money.round(currentReceived.add(settleAmount));
        installment.setReceivedAmount(newReceived);

        if (newReceived.compareTo(installment.getNetAmount()) >= 0) {
            installment.setStatus(InstallmentStatus.RECEIVED);
        } else {
            installment.setStatus(InstallmentStatus.PARTIAL);
        }

        LocalDate reqDate = (request != null && request.getReceivedAt() != null)
                ? request.getReceivedAt() : LocalDate.now();
        installment.setReceivedAt(reqDate.atStartOfDay());
        if (request != null && request.getNotes() != null && !request.getNotes().isBlank()) {
            installment.setNotes(request.getNotes().trim());
        }

        installment.setReversalReason(null);
        installment.setReversedAt(null);

        ReceivableInstallment saved = installmentRepository.save(installment);

        Receivable receivable = installment.getReceivable();
        receivable.recalculateTotals();
        receivableRepository.save(receivable);

        return toInstallmentResponse(saved);
    }

    @Transactional
    public ReceivableInstallmentResponse reverse(UUID userId, UUID installmentId, ReverseInstallmentRequest request) {
        ReceivableInstallment installment = installmentRepository.findByIdAndUserId(installmentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(INSTALLMENT_NOT_FOUND_MESSAGE));

        if (installment.getReceivedAmount() == null || installment.getReceivedAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("Esta parcela não possui recebimento para estornar.");
        }

        installment.setReceivedAmount(Money.ZERO);
        installment.setStatus(InstallmentStatus.PENDING);
        installment.setReceivedAt(null);
        installment.setReversedAt(LocalDateTime.now());
        if (request != null && request.getReason() != null && !request.getReason().isBlank()) {
            installment.setReversalReason(request.getReason().trim());
        } else {
            installment.setReversalReason("Estorno efetuado pelo usuário.");
        }

        ReceivableInstallment saved = installmentRepository.save(installment);

        Receivable receivable = installment.getReceivable();
        receivable.recalculateTotals();
        receivableRepository.save(receivable);

        return toInstallmentResponse(saved);
    }

    private Receivable generateAndSaveReceivable(
            User user,
            Sale sale,
            String description,
            BigDecimal grossAmount,
            BigDecimal feeAmount,
            BigDecimal netAmount,
            PaymentMethod paymentMethod,
            int installments,
            LocalDate baseDate,
            String notes
    ) {
        Receivable receivable = Receivable.builder()
                .user(user)
                .sale(sale)
                .description(description)
                .grossAmount(grossAmount)
                .feeAmount(feeAmount)
                .netAmount(netAmount)
                .receivedAmount(BigDecimal.ZERO)
                .paymentMethod(paymentMethod)
                .installments(installments)
                .status(ReceivableStatus.PENDING)
                .issuedAt(baseDate)
                .notes(notes)
                .build();

        receivable.setInstallmentList(new ArrayList<>(buildInstallments(receivable)));
        receivable.recalculateTotals();

        return receivableRepository.save(receivable);
    }

    private List<ReceivableInstallment> buildInstallments(Receivable receivable) {
        int installments = receivable.getInstallments();
        int settlementDays = paymentMethodConfigService
                .resolveConfig(receivable.getUser().getId(), receivable.getPaymentMethod(), installments)
                .filter(config -> Boolean.TRUE.equals(config.getIsActive()))
                .map(PaymentMethodConfig::getSettlementDays)
                .orElseGet(receivable.getPaymentMethod()::getDefaultSettlementDays);

        List<BigDecimal> grossParts = splitCents(receivable.getGrossAmount(), installments);
        List<BigDecimal> feeParts = splitCents(receivable.getFeeAmount(), installments);
        List<BigDecimal> netParts = splitCents(receivable.getNetAmount(), installments);

        List<ReceivableInstallment> installmentList = new ArrayList<>();
        for (int i = 1; i <= installments; i++) {
            long daysToAdd = (long) settlementDays + (long) (i - 1) * 30L;

            installmentList.add(ReceivableInstallment.builder()
                    .receivable(receivable)
                    .installmentNumber(i)
                    .totalInstallments(installments)
                    .dueDate(receivable.getIssuedAt().plusDays(daysToAdd))
                    .grossAmount(grossParts.get(i - 1))
                    .feeAmount(feeParts.get(i - 1))
                    .netAmount(netParts.get(i - 1))
                    .receivedAmount(BigDecimal.ZERO)
                    .status(InstallmentStatus.PENDING)
                    .notes(receivable.getNotes())
                    .build());
        }
        return installmentList;
    }

    static List<BigDecimal> splitCents(BigDecimal total, int installments) {
        long totalCents = Money.round(total).movePointRight(2).longValueExact();
        long quotient = totalCents / installments;
        long remainder = totalCents % installments;

        List<BigDecimal> parts = new ArrayList<>(installments);
        for (int i = 1; i <= installments; i++) {
            long cents = quotient + (i > installments - remainder ? 1 : 0);
            parts.add(BigDecimal.valueOf(cents, 2));
        }
        return parts;
    }

    private static int saleInstallments(Sale sale) {
        return sale.getInstallments() != null ? sale.getInstallments() : 1;
    }

    private static LocalDate saleBaseDate(Sale sale) {
        return sale.getSoldAt() != null ? sale.getSoldAt().toLocalDate() : LocalDate.now();
    }

    private static boolean financialTermsChanged(Receivable receivable, Sale sale, int installments, LocalDate baseDate) {
        return !sameAmount(receivable.getGrossAmount(), sale.getGrossAmount())
                || !sameAmount(receivable.getFeeAmount(), sale.getFeeAmount())
                || !sameAmount(receivable.getNetAmount(), sale.getNetAmount())
                || receivable.getPaymentMethod() != sale.getPaymentMethod()
                || !Objects.equals(receivable.getInstallments(), installments)
                || !Objects.equals(receivable.getIssuedAt(), baseDate);
    }

    private static boolean sameAmount(BigDecimal a, BigDecimal b) {
        return a != null && b != null ? a.compareTo(b) == 0 : a == b;
    }

    private static boolean hasReceipts(Receivable receivable) {
        return receivable.getInstallmentList().stream()
                .map(ReceivableInstallment::getReceivedAmount)
                .anyMatch(amount -> amount != null && amount.compareTo(BigDecimal.ZERO) > 0);
    }

    public ReceivableResponse toResponse(Receivable receivable) {
        List<ReceivableInstallmentResponse> installments = receivable.getInstallmentList() != null
                ? receivable.getInstallmentList().stream().map(this::toInstallmentResponse).toList()
                : List.of();

        BigDecimal remainingAmount = Money.round(
                receivable.getNetAmount().subtract(receivable.getReceivedAmount() != null
                        ? receivable.getReceivedAmount() : BigDecimal.ZERO).max(BigDecimal.ZERO)
        );

        return ReceivableResponse.builder()
                .id(receivable.getId())
                .saleId(receivable.getSale() != null ? receivable.getSale().getId() : null)
                .description(receivable.getDescription())
                .paymentMethod(receivable.getPaymentMethod())
                .paymentMethodDescription(receivable.getPaymentMethod().getDescription())
                .grossAmount(receivable.getGrossAmount())
                .feeAmount(receivable.getFeeAmount())
                .netAmount(receivable.getNetAmount())
                .receivedAmount(receivable.getReceivedAmount())
                .remainingAmount(remainingAmount)
                .installmentsCount(receivable.getInstallments())
                .status(receivable.getEffectiveStatus())
                .issuedAt(receivable.getIssuedAt())
                .notes(receivable.getNotes())
                .installments(installments)
                .createdAt(receivable.getCreatedAt())
                .build();
    }

    public ReceivableInstallmentResponse toInstallmentResponse(ReceivableInstallment installment) {
        return ReceivableInstallmentResponse.builder()
                .id(installment.getId())
                .receivableId(installment.getReceivable() != null ? installment.getReceivable().getId() : null)
                .installmentNumber(installment.getInstallmentNumber())
                .totalInstallments(installment.getTotalInstallments())
                .dueDate(installment.getDueDate())
                .grossAmount(installment.getGrossAmount())
                .feeAmount(installment.getFeeAmount())
                .netAmount(installment.getNetAmount())
                .receivedAmount(installment.getReceivedAmount())
                .remainingAmount(installment.getRemainingAmount())
                .status(installment.getEffectiveStatus())
                .overdue(installment.isOverdue())
                .receivedAt(installment.getReceivedAt())
                .reversalReason(installment.getReversalReason())
                .reversedAt(installment.getReversedAt())
                .notes(installment.getNotes())
                .build();
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidRequestException(INVALID_PAGINATION_MESSAGE);
        }
    }
}
