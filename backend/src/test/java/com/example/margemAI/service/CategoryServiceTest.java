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
import com.example.margemAI.model.User;
import com.example.margemAI.repository.CategoryRepository;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CategoryParameterCache parameterCache;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private CategoryService categoryService;

    private UUID userId;
    private UUID categoryId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        categoryId = UUID.randomUUID();
        user = User.builder().id(userId).name("MEI").email("mei@test.com").build();
    }

    private Category.CategoryBuilder categoryBuilder(String name, String slug) {
        return Category.builder()
                .id(categoryId)
                .name(name)
                .slug(slug)
                .type(ItemType.PRODUTO)
                .active(true)
                .user(user);
    }

    @Test
    void shouldCreateCategoryWithGeneratedSlug() {
        CategoryRequest request = CategoryRequest.builder()
                .name("Bebidas Geladas")
                .type(ItemType.PRODUTO)
                .targetProfitMargin(new BigDecimal("25.00"))
                .taxRate(new BigDecimal("6.00"))
                .maxDiscountAllowed(new BigDecimal("10.00"))
                .build();

        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(categoryRepository.findByUserIdAndSlug(eq(userId), any(String.class))).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        CategoryResponse response = categoryService.create(userId, request);

        assertNotNull(response);
        assertEquals("bebidas-geladas", response.getSlug());
        assertEquals(new BigDecimal("25.00"), response.getTargetProfitMargin());
        verify(eventPublisher).publishEvent(any(CategoryChangedEvent.class));
    }

    @Test
    void shouldAppendSuffixWhenSlugAlreadyExists() {
        CategoryRequest request = CategoryRequest.builder()
                .name("Bebidas")
                .type(ItemType.PRODUTO)
                .build();

        Category existing = categoryBuilder("Bebidas", "bebidas").id(UUID.randomUUID()).build();

        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(categoryRepository.findByUserIdAndSlug(userId, "bebidas")).thenReturn(Optional.of(existing));
        when(categoryRepository.findByUserIdAndSlug(userId, "bebidas-2")).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        categoryService.create(userId, request);

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepository).save(captor.capture());
        assertEquals("bebidas-2", captor.getValue().getSlug());
    }

    @Test
    void shouldAllowInactiveParentCategory() {
        Category parent = categoryBuilder("Raiz", "raiz").id(UUID.randomUUID()).active(false).build();
        CategoryRequest request = CategoryRequest.builder()
                .name("Filha")
                .type(ItemType.PRODUTO)
                .parentId(parent.getId())
                .build();

        when(categoryRepository.findByIdAndUserId(parent.getId(), userId)).thenReturn(Optional.of(parent));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(categoryRepository.findByUserIdAndSlug(eq(userId), any(String.class))).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        CategoryResponse response = categoryService.create(userId, request);

        assertEquals(parent.getId(), response.getParentId());
        assertEquals("Raiz", response.getParentName());
    }

    @Test
    void shouldThrowWhenParentCategoryNotFound() {
        CategoryRequest request = CategoryRequest.builder()
                .name("Subcategoria")
                .type(ItemType.PRODUTO)
                .parentId(UUID.randomUUID())
                .build();

        when(categoryRepository.findByIdAndUserId(any(UUID.class), eq(userId)))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> categoryService.create(userId, request));
    }

    @Test
    void shouldRejectInvalidPagination() {
        assertThrows(InvalidRequestException.class,
                () -> categoryService.findAll(userId, null, null, null, -1, 10));
    }

    @Test
    void shouldListCategoriesPaginated() {
        Category category = categoryBuilder("Bebidas", "bebidas").build();
        Page<Category> page = new PageImpl<>(List.of(category));
        when(categoryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PaginatedResponse<CategoryResponse> response =
                categoryService.findAll(userId, ItemType.PRODUTO, true, "Beb", 0, 10);

        assertEquals(1, response.getContent().size());
        assertEquals("Bebidas", response.getContent().get(0).getName());
    }

    @Test
    void shouldBlockDeleteWhenActiveProductsLinked() {
        Category category = categoryBuilder("Bebidas", "bebidas").build();
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(category));
        when(productRepository.existsByCategoryIdAndUserIdAndActiveTrue(categoryId, userId)).thenReturn(true);

        assertThrows(InvalidRequestException.class, () -> categoryService.delete(userId, categoryId));
    }

    @Test
    void shouldBlockDeleteWhenActiveChildrenExist() {
        Category category = categoryBuilder("Bebidas", "bebidas").build();
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(category));
        when(productRepository.existsByCategoryIdAndUserIdAndActiveTrue(categoryId, userId)).thenReturn(false);
        when(categoryRepository.existsByParentIdAndUserIdAndActiveTrue(categoryId, userId)).thenReturn(true);

        assertThrows(InvalidRequestException.class, () -> categoryService.delete(userId, categoryId));
    }

    @Test
    void shouldSoftDeleteCategory() {
        Category category = categoryBuilder("Bebidas", "bebidas").build();
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(category));
        when(productRepository.existsByCategoryIdAndUserIdAndActiveTrue(categoryId, userId)).thenReturn(false);
        when(categoryRepository.existsByParentIdAndUserIdAndActiveTrue(categoryId, userId)).thenReturn(false);

        categoryService.delete(userId, categoryId);

        assertFalse(category.getActive());
        verify(eventPublisher).publishEvent(any(CategoryChangedEvent.class));
    }

    @Test
    void shouldPatchStatus() {
        Category category = categoryBuilder("Bebidas", "bebidas").build();
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(category));

        CategoryResponse response = categoryService.patchStatus(
                userId, categoryId, CategoryStatusRequest.builder().active(false).build());

        assertFalse(response.getActive());
        verify(eventPublisher).publishEvent(any(CategoryChangedEvent.class));
    }

    @Test
    void shouldReactivateInactiveCategory() {
        Category category = categoryBuilder("Bebidas", "bebidas").active(false).build();
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(category));

        CategoryResponse response = categoryService.patchStatus(
                userId, categoryId, CategoryStatusRequest.builder().active(true).build());

        assertTrue(response.getActive());
    }

    @Test
    void shouldResolveInheritedParametersFromParent() {
        Category parent = Category.builder()
                .id(UUID.randomUUID())
                .name("Raiz")
                .slug("raiz")
                .type(ItemType.PRODUTO)
                .targetProfitMargin(new BigDecimal("30.00"))
                .taxRate(new BigDecimal("8.00"))
                .active(true)
                .user(user)
                .build();

        Category child = categoryBuilder("Filha", "filha").parent(parent).build();

        when(parameterCache.get(userId, categoryId)).thenReturn(Optional.empty());

        CategoryParameters parameters = categoryService.resolveParameters(child);

        assertEquals(new BigDecimal("30.00"), parameters.targetProfitMargin());
        assertEquals(new BigDecimal("8.00"), parameters.taxRate());
        assertNull(parameters.maxDiscountAllowed());
    }

    @Test
    void shouldPreferOwnParametersOverParent() {
        Category parent = Category.builder()
                .id(UUID.randomUUID())
                .name("Raiz")
                .slug("raiz")
                .type(ItemType.PRODUTO)
                .targetProfitMargin(new BigDecimal("30.00"))
                .active(true)
                .user(user)
                .build();

        Category child = categoryBuilder("Filha", "filha")
                .parent(parent)
                .targetProfitMargin(new BigDecimal("15.00"))
                .build();

        when(parameterCache.get(userId, categoryId)).thenReturn(Optional.empty());

        CategoryParameters parameters = categoryService.resolveParameters(child);

        assertEquals(new BigDecimal("15.00"), parameters.targetProfitMargin());
    }

    @Test
    void shouldNotLoopWhenHierarchyHasCycle() {
        Category parent = Category.builder()
                .id(UUID.randomUUID())
                .name("Raiz")
                .slug("raiz")
                .type(ItemType.PRODUTO)
                .active(true)
                .user(user)
                .build();
        Category child = categoryBuilder("Filha", "filha").parent(parent).build();
        parent.setParent(child);

        when(parameterCache.get(userId, categoryId)).thenReturn(Optional.empty());

        CategoryParameters parameters = categoryService.resolveParameters(child);

        assertNull(parameters.targetProfitMargin());
    }

    @Test
    void shouldRejectSelfParentOnUpdate() {
        Category category = categoryBuilder("Bebidas", "bebidas").build();
        when(categoryRepository.findByIdAndUserIdAndActiveTrue(categoryId, userId)).thenReturn(Optional.of(category));
        when(categoryRepository.findByIdAndUserId(categoryId, userId)).thenReturn(Optional.of(category));

        CategoryRequest request = CategoryRequest.builder()
                .name("Bebidas")
                .type(ItemType.PRODUTO)
                .parentId(categoryId)
                .build();

        assertThrows(InvalidRequestException.class, () -> categoryService.update(userId, categoryId, request));
    }
}
