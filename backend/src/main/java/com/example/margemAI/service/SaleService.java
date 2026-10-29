package com.example.margemAI.service;

import com.example.margemAI.dto.request.SaleRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.SaleResponse;
import com.example.margemAI.dto.response.SaleSummaryResponse;
import com.example.margemAI.event.SaleDeletedEvent;
import com.example.margemAI.event.SaleRegisteredEvent;
import com.example.margemAI.event.SaleUpdatedEvent;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.repository.VariableCostRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SaleService {

    private static final String USER_NOT_FOUND_MESSAGE = "Usuário não encontrado.";
    private static final String PRODUCT_NOT_FOUND_MESSAGE = "Produto não encontrado.";
    private static final String SALE_NOT_FOUND_MESSAGE = "Venda não encontrada.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final PaymentFeeCalculator paymentFeeCalculator;
    private final VariableCostRepository variableCostRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public SaleResponse create(UUID userId, SaleRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_MESSAGE));

        Product product = null;
        String description = request.getDescription();
        BigDecimal unitPrice = request.getUnitPrice();

        if (request.getProductId() != null) {
            product = productRepository.findByIdAndUserId(request.getProductId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_MESSAGE));

            if (description == null || description.trim().isEmpty()) {
                description = product.getName();
            }
            if (unitPrice == null) {
                unitPrice = product.getSellingPrice();
            }
        }

        if (description == null || description.trim().isEmpty()) {
            throw new InvalidRequestException("A descrição do item vendido é obrigatória quando nenhum produto for selecionado.");
        }

        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("O preço unitário deve ser maior que zero.");
        }

        PaymentFeeCalculator.FeeCalculationResult feeResult = paymentFeeCalculator.calculate(
                userId,
                request.getQuantity(),
                unitPrice,
                request.getPaymentMethod(),
                request.getInstallments(),
                request.getCustomFeePercentage()
        );

        LocalDateTime soldAt = request.getSoldAt() != null ? request.getSoldAt() : LocalDateTime.now();
        int installments = request.getPaymentMethod().normalizeInstallments(request.getInstallments());

        Sale sale = Sale.builder()
                .user(user)
                .product(product)
                .description(description.trim())
                .quantity(request.getQuantity())
                .unitPrice(unitPrice)
                .grossAmount(feeResult.grossAmount())
                .paymentMethod(request.getPaymentMethod())
                .installments(installments)
                .feePercentage(feeResult.feePercentage())
                .feeAmount(feeResult.feeAmount())
                .netAmount(feeResult.netAmount())
                .soldAt(soldAt)
                .notes(request.getNotes())
                .build();

        snapshotCost(sale, resolveUnitCost(userId, product, request.getUnitCost()));
        Sale saved = saleRepository.save(sale);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new SaleRegisteredEvent(saved));
        }
        return toResponse(saved);
    }

    @Transactional
    public SaleResponse update(UUID userId, UUID id, SaleRequest request) {
        Sale sale = saleRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(SALE_NOT_FOUND_MESSAGE));

        Product product = null;
        String description = request.getDescription();
        BigDecimal unitPrice = request.getUnitPrice();

        if (request.getProductId() != null) {
            product = productRepository.findByIdAndUserId(request.getProductId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException(PRODUCT_NOT_FOUND_MESSAGE));

            if (description == null || description.trim().isEmpty()) {
                description = product.getName();
            }
            if (unitPrice == null) {
                unitPrice = product.getSellingPrice();
            }
        }

        if (description == null || description.trim().isEmpty()) {
            throw new InvalidRequestException("A descrição do item vendido é obrigatória quando nenhum produto for selecionado.");
        }

        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("O preço unitário deve ser maior que zero.");
        }

        PaymentFeeCalculator.FeeCalculationResult feeResult = paymentFeeCalculator.calculate(
                userId,
                request.getQuantity(),
                unitPrice,
                request.getPaymentMethod(),
                request.getInstallments(),
                request.getCustomFeePercentage()
        );

        LocalDateTime soldAt = request.getSoldAt() != null ? request.getSoldAt() : sale.getSoldAt();
        int installments = request.getPaymentMethod().normalizeInstallments(request.getInstallments());

        boolean sameProduct = Objects.equals(
                sale.getProduct() != null ? sale.getProduct().getId() : null,
                product != null ? product.getId() : null);
        BigDecimal unitCost = request.getUnitCost() == null && sameProduct && sale.getUnitCost() != null
                ? sale.getUnitCost() : resolveUnitCost(userId, product, request.getUnitCost());
        if (request.getUnitCost() != null || !sameProduct) {
            sale.setCostEstimated(false);
        }
        sale.setProduct(product);
        sale.setDescription(description.trim());
        sale.setQuantity(request.getQuantity());
        snapshotCost(sale, unitCost);
        sale.setUnitPrice(unitPrice);
        sale.setGrossAmount(feeResult.grossAmount());
        sale.setPaymentMethod(request.getPaymentMethod());
        sale.setInstallments(installments);
        sale.setFeePercentage(feeResult.feePercentage());
        sale.setFeeAmount(feeResult.feeAmount());
        sale.setNetAmount(feeResult.netAmount());
        sale.setSoldAt(soldAt);
        sale.setNotes(request.getNotes());

        Sale saved = saleRepository.save(sale);
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new SaleUpdatedEvent(saved));
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SaleSummaryResponse findAll(
            UUID userId,
            LocalDateTime startDate,
            LocalDateTime endDate,
            PaymentMethod paymentMethod,
            UUID productId,
            int page,
            int size
    ) {
        validatePagination(page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "soldAt"));

        Specification<Sale> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));

            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("soldAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("soldAt"), endDate));
            }
            if (paymentMethod != null) {
                predicates.add(cb.equal(root.get("paymentMethod"), paymentMethod));
            }
            if (productId != null) {
                predicates.add(cb.equal(root.get("product").get("id"), productId));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Sale> salesPage = saleRepository.findAll(spec, pageable);
        PaginatedResponse<SaleResponse> paginated = PaginatedResponse.from(salesPage, this::toResponse);

        // Sum over user filtered dataset or all user sales
        List<Sale> allFilteredSales = saleRepository.findAll(spec);
        BigDecimal totalGross = allFilteredSales.stream()
                .map(Sale::getGrossAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalFee = allFilteredSales.stream()
                .map(Sale::getFeeAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalNet = allFilteredSales.stream()
                .map(Sale::getNetAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return SaleSummaryResponse.builder()
                .totalGrossRevenue(totalGross)
                .totalFeeAmount(totalFee)
                .totalNetRevenue(totalNet)
                .totalSalesCount((long) allFilteredSales.size())
                .sales(paginated)
                .build();
    }

    @Transactional(readOnly = true)
    public SaleResponse findById(UUID userId, UUID id) {
        Sale sale = saleRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(SALE_NOT_FOUND_MESSAGE));
        return toResponse(sale);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Sale sale = saleRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(SALE_NOT_FOUND_MESSAGE));
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new SaleDeletedEvent(sale.getId(), userId));
        }
        saleRepository.delete(sale);
    }

    public SaleResponse toResponse(Sale sale) {
        return SaleResponse.builder()
                .id(sale.getId())
                .productId(sale.getProduct() != null ? sale.getProduct().getId() : null)
                .productName(sale.getProduct() != null ? sale.getProduct().getName() : null)
                .description(sale.getDescription())
                .quantity(sale.getQuantity())
                .unitPrice(sale.getUnitPrice())
                .unitCost(sale.getUnitCost())
                .operationCost(sale.getOperationCost())
                .costEstimated(sale.getCostEstimated())
                .grossAmount(sale.getGrossAmount())
                .paymentMethod(sale.getPaymentMethod())
                .paymentMethodDescription(sale.getPaymentMethod().getDescription())
                .installments(sale.getInstallments())
                .feePercentage(sale.getFeePercentage())
                .feeAmount(sale.getFeeAmount())
                .netAmount(sale.getNetAmount())
                .soldAt(sale.getSoldAt())
                .notes(sale.getNotes())
                .createdAt(sale.getCreatedAt())
                .build();
    }

    public BigDecimal resolveUnitCost(UUID userId, Product product, BigDecimal explicitCost) {
        if (explicitCost != null) {
            if (explicitCost.signum() < 0) {
                throw new InvalidRequestException("O custo unitário não pode ser negativo.");
            }
            return explicitCost.setScale(2, RoundingMode.HALF_UP);
        }
        if (product == null) {
            return BigDecimal.ZERO.setScale(2);
        }
        BigDecimal linkedCost = variableCostRepository
                .findByProductIdAndUserIdAndActiveTrue(product.getId(), userId).stream()
                .map(VariableCost::getUnitAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cost = linkedCost.signum() > 0 ? linkedCost
                : product.getBaseCost() != null ? product.getBaseCost() : BigDecimal.ZERO;
        return cost.setScale(2, RoundingMode.HALF_UP);
    }

    public void snapshotCost(Sale sale, BigDecimal unitCost) {
        sale.setUnitCost(unitCost);
        sale.setOperationCost(unitCost.multiply(sale.getQuantity()).setScale(2, RoundingMode.HALF_UP));
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidRequestException(INVALID_PAGINATION_MESSAGE);
        }
    }
}
