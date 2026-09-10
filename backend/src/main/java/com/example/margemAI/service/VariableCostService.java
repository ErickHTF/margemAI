package com.example.margemAI.service;

import com.example.margemAI.dto.request.VariableCostRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.VariableCostResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
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

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VariableCostService {

    private static final String NOT_FOUND_MESSAGE = "Custo variável não encontrado.";
    private static final String FULL_UPDATE_REQUIRED_MESSAGE =
            "Nome, valor unitário e categoria são obrigatórios para a criação ou atualização completa de um custo variável.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";
    private static final String INVALID_PRODUCT_MESSAGE =
            "Produto ou serviço informado não existe ou não pertence ao usuário.";

    private final VariableCostRepository variableCostRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PaginatedResponse<VariableCostResponse> findAll(UUID userId, UUID productId, VariableCostCategory category, int page, int size) {
        validatePagination(page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<VariableCost> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            predicates.add(cb.isTrue(root.get("active")));
            if (productId != null) {
                predicates.add(cb.equal(root.get("productId"), productId));
            }
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<VariableCost> result = variableCostRepository.findAll(spec, pageable);
        Map<UUID, String> productNames = productNamesByIds(userId, linkedProductIds(result.getContent()));
        return PaginatedResponse.from(result, cost -> toResponse(cost, productNames));
    }

    @Transactional(readOnly = true)
    public VariableCostResponse findById(UUID userId, UUID id) {
        VariableCost cost = findActive(userId, id);
        return toResponse(cost, productNamesByIds(userId, linkedProductIds(List.of(cost))));
    }

    @Transactional
    public VariableCostResponse create(UUID userId, VariableCostRequest request) {
        validateFullRequest(request);
        UUID productId = validateProductId(userId, request.getProductId());
        VariableCost cost = VariableCost.builder()
                .name(normalizeName(request.getName()))
                .unitAmount(request.getUnitAmount())
                .category(request.getCategory())
                .productId(productId)
                .active(true)
                .user(userRepository.getReferenceById(userId))
                .build();
        cost = variableCostRepository.save(cost);
        return toResponse(cost, productNamesByIds(userId, linkedProductIds(List.of(cost))));
    }

    @Transactional
    public VariableCostResponse update(UUID userId, UUID id, VariableCostRequest request) {
        validateFullRequest(request);
        VariableCost cost = findActive(userId, id);
        cost.setName(normalizeName(request.getName()));
        cost.setUnitAmount(request.getUnitAmount());
        cost.setCategory(request.getCategory());
        cost.setProductId(validateProductId(userId, request.getProductId()));
        cost = variableCostRepository.save(cost);
        return toResponse(cost, productNamesByIds(userId, linkedProductIds(List.of(cost))));
    }

    @Transactional
    public VariableCostResponse patch(UUID userId, UUID id, VariableCostRequest request) {
        VariableCost cost = findActive(userId, id);
        if (request.getName() != null) {
            cost.setName(normalizeName(request.getName()));
        }
        if (request.getUnitAmount() != null) {
            cost.setUnitAmount(request.getUnitAmount());
        }
        if (request.getCategory() != null) {
            cost.setCategory(request.getCategory());
        }
        if (request.getProductId() != null) {
            cost.setProductId(validateProductId(userId, request.getProductId()));
        }
        cost = variableCostRepository.save(cost);
        return toResponse(cost, productNamesByIds(userId, linkedProductIds(List.of(cost))));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        VariableCost cost = variableCostRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        cost.setActive(false);
    }

    private VariableCost findActive(UUID userId, UUID id) {
        return variableCostRepository.findByIdAndUserIdAndActiveTrue(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }

    private void validateFullRequest(VariableCostRequest request) {
        if (request.getName() == null || request.getUnitAmount() == null || request.getCategory() == null) {
            throw new InvalidRequestException(FULL_UPDATE_REQUIRED_MESSAGE);
        }
        normalizeName(request.getName());
    }

    private String normalizeName(String name) {
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidRequestException("O nome do custo é obrigatório.");
        }
        return trimmed;
    }

    private UUID validateProductId(UUID userId, UUID productId) {
        if (productId == null) {
            return null;
        }
        if (productRepository.findByIdAndUserIdAndActiveTrue(productId, userId).isEmpty()) {
            throw new InvalidRequestException(INVALID_PRODUCT_MESSAGE);
        }
        return productId;
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidRequestException(INVALID_PAGINATION_MESSAGE);
        }
    }

    private List<UUID> linkedProductIds(Collection<VariableCost> costs) {
        return costs.stream()
                .map(VariableCost::getProductId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private Map<UUID, String> productNamesByIds(UUID userId, Collection<UUID> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return productRepository.findByActiveTrueAndIdInAndUserId(productIds, userId).stream()
                .collect(Collectors.toMap(Product::getId, Product::getName));
    }

    private VariableCostResponse toResponse(VariableCost cost, Map<UUID, String> productNames) {
        String productName = cost.getProductId() != null ? productNames.get(cost.getProductId()) : null;
        return VariableCostResponse.builder()
                .id(cost.getId())
                .name(cost.getName())
                .unitAmount(cost.getUnitAmount())
                .category(cost.getCategory())
                .productId(cost.getProductId())
                .productName(productName)
                .createdAt(cost.getCreatedAt())
                .updatedAt(cost.getUpdatedAt())
                .build();
    }
}
