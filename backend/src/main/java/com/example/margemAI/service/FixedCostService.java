package com.example.margemAI.service;

import com.example.margemAI.dto.request.FixedCostRequest;
import com.example.margemAI.dto.response.FixedCostResponse;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FixedCostService {

    private static final String NOT_FOUND_MESSAGE = "Custo fixo não encontrado.";
    private static final String FULL_UPDATE_REQUIRED_MESSAGE =
            "Nome, valor e categoria são obrigatórios para a criação ou atualização completa de um custo fixo.";
    private static final String INVALID_MONTH_MESSAGE = "Mês inválido. Use o formato AAAA-MM.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";

    private final FixedCostRepository fixedCostRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PaginatedResponse<FixedCostResponse> findAll(UUID userId, String month, FixedCostCategory category, int page, int size) {
        validatePagination(page, size);
        YearMonth referenceMonth = parseMonth(month);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<FixedCost> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            predicates.add(cb.isTrue(root.get("active")));
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (referenceMonth != null) {
                LocalDate monthStart = referenceMonth.atDay(1);
                LocalDate nextMonthStart = referenceMonth.plusMonths(1).atDay(1);
                predicates.add(cb.or(
                        cb.isTrue(root.get("recurring")),
                        cb.and(
                                cb.isNotNull(root.get("dueDate")),
                                cb.greaterThanOrEqualTo(root.get("dueDate"), monthStart),
                                cb.lessThan(root.get("dueDate"), nextMonthStart)
                        )
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<FixedCost> result = fixedCostRepository.findAll(spec, pageable);
        return PaginatedResponse.from(result, this::toResponse);
    }

    @Transactional(readOnly = true)
    public FixedCostResponse findById(UUID userId, UUID id) {
        return toResponse(findActive(userId, id));
    }

    @Transactional
    public FixedCostResponse create(UUID userId, FixedCostRequest request) {
        validateFullRequest(request);
        FixedCost cost = FixedCost.builder()
                .name(normalizeName(request.getName()))
                .amount(request.getAmount())
                .category(request.getCategory())
                .dueDate(request.getDueDate())
                .recurring(request.getRecurring() == null || request.getRecurring())
                .active(true)
                .user(userRepository.getReferenceById(userId))
                .build();
        return toResponse(fixedCostRepository.save(cost));
    }

    @Transactional
    public FixedCostResponse update(UUID userId, UUID id, FixedCostRequest request) {
        validateFullRequest(request);
        FixedCost cost = findActive(userId, id);
        cost.setName(normalizeName(request.getName()));
        cost.setAmount(request.getAmount());
        cost.setCategory(request.getCategory());
        cost.setDueDate(request.getDueDate());
        cost.setRecurring(request.getRecurring() == null || request.getRecurring());
        return toResponse(cost);
    }

    @Transactional
    public FixedCostResponse patch(UUID userId, UUID id, FixedCostRequest request) {
        FixedCost cost = findActive(userId, id);
        if (request.getName() != null) {
            cost.setName(normalizeName(request.getName()));
        }
        if (request.getAmount() != null) {
            cost.setAmount(request.getAmount());
        }
        if (request.getCategory() != null) {
            cost.setCategory(request.getCategory());
        }
        if (request.getDueDate() != null) {
            cost.setDueDate(request.getDueDate());
        }
        if (request.getRecurring() != null) {
            cost.setRecurring(request.getRecurring());
        }
        return toResponse(cost);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        FixedCost cost = fixedCostRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        cost.setActive(false);
    }

    private FixedCost findActive(UUID userId, UUID id) {
        return fixedCostRepository.findByIdAndUserIdAndActiveTrue(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }

    private void validateFullRequest(FixedCostRequest request) {
        if (request.getName() == null || request.getAmount() == null || request.getCategory() == null) {
            throw new InvalidRequestException(FULL_UPDATE_REQUIRED_MESSAGE);
        }
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

    private YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return null;
        }
        try {
            return YearMonth.parse(month.trim());
        } catch (DateTimeParseException ex) {
            throw new InvalidRequestException(INVALID_MONTH_MESSAGE);
        }
    }

    private FixedCostResponse toResponse(FixedCost cost) {
        return FixedCostResponse.builder()
                .id(cost.getId())
                .name(cost.getName())
                .amount(cost.getAmount())
                .category(cost.getCategory())
                .dueDate(cost.getDueDate())
                .recurring(cost.getRecurring())
                .active(cost.getActive())
                .createdAt(cost.getCreatedAt())
                .updatedAt(cost.getUpdatedAt())
                .build();
    }
}
