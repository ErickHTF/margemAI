package com.example.margemAI.service;

import com.example.margemAI.dto.request.ProductRequest;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.ProductResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.repository.VariableCostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private VariableCostRepository variableCostRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProductService productService;

    private UUID userId;
    private UUID productId;
    private User user;
    private Product product;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();

        user = User.builder()
                .id(userId)
                .name("Test MEI")
                .email("mei@test.com")
                .build();

        product = Product.builder()
                .id(productId)
                .name("Camiseta Estampada")
                .description("100% Algodão")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("20.00"))
                .sellingPrice(new BigDecimal("50.00"))
                .active(true)
                .user(user)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void shouldCreateProductSuccessfully() {
        ProductRequest request = ProductRequest.builder()
                .name("  Camiseta Estampada  ")
                .description("  100% Algodão  ")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("20.00"))
                .sellingPrice(new BigDecimal("50.00"))
                .build();

        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(productRepository.save(any(Product.class))).thenReturn(product);
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(List.of());

        ProductResponse response = productService.create(userId, request);

        assertNotNull(response);
        assertEquals("Camiseta Estampada", response.getName());
        assertEquals(ItemType.PRODUTO, response.getType());
        assertEquals(new BigDecimal("20.00"), response.getEffectiveBaseCost());
        assertEquals(new BigDecimal("50.00"), response.getSellingPrice());
        assertEquals(new BigDecimal("30.00"), response.getContributionMargin());
        assertEquals(new BigDecimal("60.00"), response.getMarginPercentage());
        verify(productRepository).save(any(Product.class));
    }

    @Test
    void shouldCalculateDynamicBaseCostFromLinkedVariableCosts() {
        VariableCost cost1 = VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Tecido")
                .unitAmount(new BigDecimal("15.00"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .productId(productId)
                .active(true)
                .build();

        VariableCost cost2 = VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Etiqueta")
                .unitAmount(new BigDecimal("5.00"))
                .category(VariableCostCategory.EMBALAGEM)
                .productId(productId)
                .active(true)
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(Optional.of(product));
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(List.of(cost1, cost2));

        ProductResponse response = productService.findById(userId, productId);

        assertNotNull(response);
        assertEquals(new BigDecimal("20.00"), response.getVariableCostsTotal());
        assertEquals(new BigDecimal("20.00"), response.getEffectiveBaseCost());
        assertEquals(new BigDecimal("30.00"), response.getContributionMargin());
    }

    @Test
    void shouldThrowExceptionWhenCreateProductMissingRequiredFields() {
        ProductRequest request = ProductRequest.builder()
                .name("")
                .type(ItemType.PRODUTO)
                .sellingPrice(new BigDecimal("50.00"))
                .build();

        assertThrows(InvalidRequestException.class, () -> productService.create(userId, request));
    }

    @Test
    void shouldThrowExceptionWhenSellingPriceIsZeroOrNegative() {
        ProductRequest request = ProductRequest.builder()
                .name("Serviço de Consultoria")
                .type(ItemType.SERVICO)
                .sellingPrice(BigDecimal.ZERO)
                .build();

        assertThrows(InvalidRequestException.class, () -> productService.create(userId, request));
    }

    @Test
    void shouldFindAllProductsWithFilters() {
        Page<Product> page = new PageImpl<>(List.of(product));
        when(productRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(List.of());

        PaginatedResponse<ProductResponse> response = productService.findAll(userId, ItemType.PRODUTO, "Camiseta", true, 0, 10);

        assertNotNull(response);
        assertEquals(1, response.getContent().size());
        assertEquals("Camiseta Estampada", response.getContent().get(0).getName());
    }

    @Test
    void shouldUpdateProductSuccessfully() {
        ProductRequest request = ProductRequest.builder()
                .name("Camiseta Lisa")
                .description("Sem estampa")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("15.00"))
                .sellingPrice(new BigDecimal("45.00"))
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(Optional.of(product));
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(List.of());

        ProductResponse response = productService.update(userId, productId, request);

        assertNotNull(response);
        assertEquals("Camiseta Lisa", response.getName());
        assertEquals(new BigDecimal("45.00"), response.getSellingPrice());
    }

    @Test
    void shouldPatchProductSuccessfully() {
        ProductRequest request = ProductRequest.builder()
                .sellingPrice(new BigDecimal("60.00"))
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(Optional.of(product));
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(List.of());

        ProductResponse response = productService.patch(userId, productId, request);

        assertNotNull(response);
        assertEquals(new BigDecimal("60.00"), response.getSellingPrice());
    }

    @Test
    void shouldDeleteProduct() {
        when(productRepository.findByIdAndUserId(productId, userId)).thenReturn(Optional.of(product));

        productService.delete(userId, productId);

        assertFalse(product.getActive());
    }

    @Test
    void shouldThrowExceptionWhenProductNotFound() {
        when(productRepository.findByIdAndUserIdAndActiveTrue(productId, userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.findById(userId, productId));
    }
}
