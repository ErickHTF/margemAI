package com.example.margemAI.service;

import com.example.margemAI.dto.request.CategoryRequest;
import com.example.margemAI.dto.request.CategoryStatusRequest;
import com.example.margemAI.dto.response.CategoryResponse;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.event.CategoryChangedEvent;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Category;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.repository.CategoryRepository;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.UserRepository;
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
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private static final String NOT_FOUND_MESSAGE = "Categoria não encontrada.";
    private static final String INVALID_PAGINATION_MESSAGE =
            "Parâmetros de paginação inválidos. page deve ser >= 0 e size entre 1 e 100.";

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CategoryParameterCache parameterCache;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public PaginatedResponse<CategoryResponse> findAll(UUID userId, ItemType type, Boolean active, String search, int page, int size) {
        validatePagination(page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));

        Specification<Category> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));

            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
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

        Page<Category> result = categoryRepository.findAll(spec, pageable);
        return PaginatedResponse.from(result, this::toResponse);
    }

    @Transactional(readOnly = true)
    public CategoryResponse findById(UUID userId, UUID id) {
        return toResponse(findActive(userId, id));
    }

    @Transactional
    public CategoryResponse create(UUID userId, CategoryRequest request) {
        Category parent = resolveParent(userId, request.getParentId());
        Category category = Category.builder()
                .name(normalizeName(request.getName()))
                .slug(uniqueSlug(userId, slugify(request.getName()), null))
                .type(request.getType())
                .targetProfitMargin(request.getTargetProfitMargin())
                .taxRate(request.getTaxRate())
                .maxDiscountAllowed(request.getMaxDiscountAllowed())
                .parent(parent)
                .active(true)
                .user(userRepository.getReferenceById(userId))
                .build();
        Category saved = categoryRepository.save(category);
        publishChanged(userId);
        return toResponse(saved);
    }

    @Transactional
    public CategoryResponse update(UUID userId, UUID id, CategoryRequest request) {
        Category category = findActive(userId, id);
        Category parent = resolveParent(userId, request.getParentId());
        validateParentAssignment(category, parent);

        category.setName(normalizeName(request.getName()));
        category.setSlug(uniqueSlug(userId, slugify(request.getName()), category.getId()));
        category.setType(request.getType());
        category.setTargetProfitMargin(request.getTargetProfitMargin());
        category.setTaxRate(request.getTaxRate());
        category.setMaxDiscountAllowed(request.getMaxDiscountAllowed());
        category.setParent(parent);

        publishChanged(userId);
        return toResponse(category);
    }

    @Transactional
    public CategoryResponse patchStatus(UUID userId, UUID id, CategoryStatusRequest request) {
        Category category = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
        category.setActive(request.getActive());
        publishChanged(userId);
        return toResponse(category);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Category category = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));

        if (productRepository.existsByCategoryIdAndUserIdAndActiveTrue(id, userId)) {
            throw new InvalidRequestException(
                    "Não é possível remover a categoria enquanto houver produtos ou serviços ativos vinculados a ela.");
        }
        if (categoryRepository.existsByParentIdAndUserIdAndActiveTrue(id, userId)) {
            throw new InvalidRequestException(
                    "Não é possível remover a categoria enquanto houver subcategorias ativas vinculadas a ela.");
        }

        category.setActive(false);
        publishChanged(userId);
    }

    @Transactional(readOnly = true)
    public Category findEntity(UUID userId, UUID id) {
        return findActive(userId, id);
    }

    @Transactional(readOnly = true)
    public CategoryParameters resolveParameters(Category category) {
        UUID userId = category.getUser().getId();
        Optional<CategoryParameters> cached = parameterCache.get(userId, category.getId());
        if (cached.isPresent()) {
            return cached.get();
        }

        BigDecimal margin = null;
        BigDecimal taxRate = null;
        BigDecimal maxDiscount = null;
        Set<UUID> visited = new HashSet<>();
        Category current = category;

        while (current != null && visited.add(current.getId())) {
            if (margin == null) {
                margin = current.getTargetProfitMargin();
            }
            if (taxRate == null) {
                taxRate = current.getTaxRate();
            }
            if (maxDiscount == null) {
                maxDiscount = current.getMaxDiscountAllowed();
            }
            current = current.getParent();
        }

        CategoryParameters resolved = new CategoryParameters(margin, taxRate, maxDiscount);
        parameterCache.put(userId, category.getId(), resolved);
        return resolved;
    }

    private Category findActive(UUID userId, UUID id) {
        return categoryRepository.findByIdAndUserIdAndActiveTrue(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND_MESSAGE));
    }

    private Category resolveParent(UUID userId, UUID parentId) {
        if (parentId == null) {
            return null;
        }
        return categoryRepository.findByIdAndUserId(parentId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria pai não encontrada."));
    }

    private void validateParentAssignment(Category category, Category newParent) {
        if (newParent == null) {
            return;
        }
        if (category.getId().equals(newParent.getId())) {
            throw new InvalidRequestException("Uma categoria não pode ser pai de si mesma.");
        }

        Set<UUID> visited = new HashSet<>();
        Category current = newParent;
        while (current != null && visited.add(current.getId())) {
            if (category.getId().equals(current.getId())) {
                throw new InvalidRequestException("A hierarquia de categorias não pode conter ciclos.");
            }
            current = current.getParent();
        }
    }

    private String uniqueSlug(UUID userId, String baseSlug, UUID currentCategoryId) {
        String candidate = baseSlug;
        int suffix = 2;
        while (true) {
            Optional<Category> existing = categoryRepository.findByUserIdAndSlug(userId, candidate);
            if (existing.isEmpty() || existing.get().getId().equals(currentCategoryId)) {
                return candidate;
            }
            candidate = baseSlug + "-" + suffix++;
        }
    }

    private String slugify(String value) {
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        String slug = normalized.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        return slug.isEmpty() ? "categoria" : slug;
    }

    private String normalizeName(String name) {
        String trimmed = name.trim();
        if (trimmed.isEmpty()) {
            throw new InvalidRequestException("O nome da categoria é obrigatório.");
        }
        return trimmed;
    }

    private void validatePagination(int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidRequestException(INVALID_PAGINATION_MESSAGE);
        }
    }

    private void publishChanged(UUID userId) {
        eventPublisher.publishEvent(new CategoryChangedEvent(userId));
    }

    private CategoryResponse toResponse(Category category) {
        Category parent = category.getParent();
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .type(category.getType())
                .targetProfitMargin(category.getTargetProfitMargin())
                .taxRate(category.getTaxRate())
                .maxDiscountAllowed(category.getMaxDiscountAllowed())
                .active(category.getActive())
                .parentId(parent != null ? parent.getId() : null)
                .parentName(parent != null ? parent.getName() : null)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}
