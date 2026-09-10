package com.example.margemAI.service;

import com.example.margemAI.dto.request.VariableCostRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.VariableCostResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
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
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VariableCostService {

    private static final String NOT_FOUND_MESSAGE = "Custo variável não encontrado.";
    private static final String FULL_UPDATE_REQUIRED_MESSAGE =
            "Nome, valor unitário e categoria são obrigatórios para a criação ou atualização completa de um custo variável.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";

    private final VariableCostRepository variableCostRepository;
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
        return PaginatedResponse.from(result, this::toResponse);
    }

    @Transactional(readOnly = true)
    public VariableCostResponse findById(UUID userId, UUID id) {
        return toResponse(findActive(userId, id));
    }

    @Transactional
    public VariableCostResponse create(UUID userId, VariableCostRequest request) {
        validateFullRequest(request);
        VariableCost cost = VariableCost.builder()
                .name(normalizeName(request.getName()))
                .unitAmount(request.getUnitAmount())
                .category(request.getCategory())
                .productId(request.getProductId())
                .active(true)
                .user(userRepository.getReferenceById(userId))
                .build();
        return toResponse(variableCostRepository.save(cost));
    }

    @Transactional
    public VariableCostResponse update(UUID userId, UUID id, VariableCostRequest request) {
        validateFullRequest(request);
        VariableCost cost = findActive(userId, id);
        cost.setName(normalizeName(request.getName()));
        cost.setUnitAmount(request.getUnitAmount());
        cost.setCategory(request.getCategory());
        cost.setProductId(request.getProductId());
        cost = variableCostRepository.save(cost);
        return toResponse(cost);
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
            cost.setProductId(request.getProductId());
        }
        cost = variableCostRepository.save(cost);
        return toResponse(cost);
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

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidRequestException(INVALID_PAGINATION_MESSAGE);
        }
    }

    private VariableCostResponse toResponse(VariableCost cost) {
        return VariableCostResponse.builder()
                .id(cost.getId())
                .name(cost.getName())
                .unitAmount(cost.getUnitAmount())
                .category(cost.getCategory())
                .productId(cost.getProductId())
                .createdAt(cost.getCreatedAt())
                .updatedAt(cost.getUpdatedAt())
                .build();
    }
}
