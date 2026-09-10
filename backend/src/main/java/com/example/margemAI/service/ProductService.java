package com.example.margemAI.service;

import com.example.margemAI.dto.request.ProductRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.ProductResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.repository.VariableCostRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final String NOT_FOUND_MESSAGE = "Produto ou serviço não encontrado.";
    private static final String FULL_UPDATE_REQUIRED_MESSAGE =
            "Nome, tipo e preço de venda são obrigatórios para a criação ou atualização de um produto ou serviço.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";

    private final ProductRepository productRepository;
    private final VariableCostRepository variableCostRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PaginatedResponse<ProductResponse> findAll(UUID userId, ItemType type, String search, Boolean active, int page, int size) {
        validatePagination(page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            } else {
                predicates.add(cb.isTrue(root.get("active")));
            }

            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }

            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.like(cb.lower(root.get("name")), pattern));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Product> result = productRepository.findAll(spec, pageable);
        return PaginatedResponse.from(result, product -> toResponse(product, userId));
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(UUID userId, UUID id) {
        return toResponse(findActive(userId, id), userId);
    }

    @Transactional
    public ProductResponse create(UUID userId, ProductRequest request) {
        validateFullRequest(request);
        Product product = Product.builder()
                .name(normalizeName(request.getName()))
                .description(normalizeDescription(request.getDescription()))
                .type(request.getType())
                .baseCost(request.getBaseCost() != null ? request.getBaseCost() : BigDecimal.ZERO)
                .sellingPrice(request.getSellingPrice())
                .active(true)
                .user(userRepository.getReferenceById(userId))
                .build();
        return toResponse(productRepository.save(product), userId);
    }

    @Transactional
    public ProductResponse update(UUID userId, UUID id, ProductRequest request) {
        validateFullRequest(request);
        Product product = findActive(userId, id);
        product.setName(normalizeName(request.getName()));
        product.setDescription(normalizeDescription(request.getDescription()));
        product.setType(request.getType());
        product.setBaseCost(request.getBaseCost() != null ? request.getBaseCost() : BigDecimal.ZERO);
        product.setSellingPrice(request.getSellingPrice());
        return toResponse(product, userId);
    }

    @Transactional
    public ProductResponse patch(UUID userId, UUID id, ProductRequest request) {
        Product product = findActive(userId, id);
        if (request.getName() != null) {
            product.setName(normalizeName(request.getName()));
        }
        if (request.getDescription() != null) {
            product.setDescription(normalizeDescription(request.getDescription()));
        }
        if (request.getType() != null) {
            product.setType(request.getType());
        }
        if (request.getBaseCost() != null) {
            product.setBaseCost(request.getBaseCost());
        }
        if (request.getSellingPrice() != null) {
            if (request.getSellingPrice().compareTo(BigDecimal.ZERO) <= 0) {
                throw new InvalidRequestException("O preço de venda deve ser maior que zero.");
            }
            product.setSellingPrice(request.getSellingPrice());
        }
        return toResponse(product, userId);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Product product = productRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        product.setActive(false);
    }

    private Product findActive(UUID userId, UUID id) {
        return productRepository.findByIdAndUserIdAndActiveTrue(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }

    private void validateFullRequest(ProductRequest request) {
        if (request.getName() == null || request.getType() == null || request.getSellingPrice() == null) {
            throw new InvalidRequestException(FULL_UPDATE_REQUIRED_MESSAGE);
        }
        if (request.getSellingPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidRequestException("O preço de venda deve ser maior que zero.");
        }
        request.setName(normalizeName(request.getName()));
    }

    private String normalizeName(String name) {
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidRequestException("O nome do produto ou serviço é obrigatório.");
        }
        return trimmed;
    }

    private String normalizeDescription(String description) {
        if (description == null) return null;
        String trimmed = description.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidRequestException(INVALID_PAGINATION_MESSAGE);
        }
    }

    public ProductResponse toResponse(Product product, UUID userId) {
        List<VariableCost> variableCosts = variableCostRepository.findByProductIdAndUserIdAndActiveTrue(product.getId(), userId);

        BigDecimal variableCostsTotal = variableCosts.stream()
                .map(VariableCost::getUnitAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal manualBase = product.getBaseCost() != null ? product.getBaseCost() : BigDecimal.ZERO;
        BigDecimal effectiveBaseCost = variableCostsTotal.compareTo(BigDecimal.ZERO) > 0 ? variableCostsTotal : manualBase;
        effectiveBaseCost = effectiveBaseCost.setScale(2, RoundingMode.HALF_UP);

        BigDecimal sellingPrice = product.getSellingPrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal contributionMargin = sellingPrice.subtract(effectiveBaseCost).setScale(2, RoundingMode.HALF_UP);

        BigDecimal marginPercentage = BigDecimal.ZERO;
        if (sellingPrice.compareTo(BigDecimal.ZERO) > 0) {
            marginPercentage = contributionMargin
                    .divide(sellingPrice, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, RoundingMode.HALF_UP);
        }

        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .type(product.getType())
                .baseCost(manualBase)
                .variableCostsTotal(variableCostsTotal)
                .effectiveBaseCost(effectiveBaseCost)
                .sellingPrice(sellingPrice)
                .contributionMargin(contributionMargin)
                .marginPercentage(marginPercentage)
                .active(product.getActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}
