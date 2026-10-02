package com.example.margemAI.service;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.model.Category;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.VariableCostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private VariableCostRepository variableCostRepository;

    @Mock
    private CategoryService categoryService;

    @Mock
    private FixedCostProfileService fixedCostProfileService;

    @InjectMocks
    private PricingService pricingService;

    private UUID userId = UUID.randomUUID();

    @Test
    void shouldCalculatePricingSuccessfullyWithStandardSebraeMarkup() {
        UUID productId = UUID.randomUUID();
        com.example.margemAI.model.Product product = com.example.margemAI.model.Product.builder()
                .id(productId)
                .name("Produto Teste")
                .baseCost(new BigDecimal("18.50"))
                .build();
        
        when(productRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(product));

        PricingRequest request = PricingRequest.builder()
                .productId(productId)
                .fixedCostPercent(new BigDecimal("10.00"))
                .variableCostPercent(new BigDecimal("15.00"))
                .desiredMargin(new BigDecimal("25.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("18.50"), response.getBaseCost());
        assertEquals(new BigDecimal("37.00"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("2.00"), response.getMarkup());
        assertEquals(new BigDecimal("3.70"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("5.55"), response.getTotalVariableCosts());
        assertEquals(new BigDecimal("27.75"), response.getTotalUnitCost());
        assertEquals(new BigDecimal("9.25"), response.getUnitProfit());
        assertEquals(new BigDecimal("50.00"), response.getGrossMargin());
        assertEquals(new BigDecimal("12.95"), response.getContributionMargin());
    }

    @Test
    void shouldCalculatePricingWithoutFixedCostsWhenDisabled() {
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("50.00"))
                .fixedCostPercent(new BigDecimal("15.00"))
                .variableCostPercent(new BigDecimal("10.00"))
                .desiredMargin(new BigDecimal("10.00"))
                .includeFixedCosts(false)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("50.00"), response.getBaseCost());
        assertEquals(new BigDecimal("0.00"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("62.50"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("1.25"), response.getMarkup());
    }

    @Test
    void shouldThrowExceptionWhenSumOfPercentagesEqualsOrExceeds100() {
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("100.00"))
                .fixedCostPercent(new BigDecimal("40.00"))
                .variableCostPercent(new BigDecimal("30.00"))
                .desiredMargin(new BigDecimal("30.00"))
                .includeFixedCosts(true)
                .build();

        assertThrows(InvalidFinancialCalculationException.class, () -> pricingService.calculatePricing(request, userId));
    }

    @Test
    void shouldNotDivideByZeroWhenSumOfPercentagesIsJustBelow100() {
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("100.00"))
                .fixedCostPercent(new BigDecimal("99.99"))
                .variableCostPercent(new BigDecimal("0.001"))
                .desiredMargin(new BigDecimal("0.005"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertTrue(response.getMinimumSellingPrice().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    void shouldThrowExceptionWhenBaseCostIsNull() {
        PricingRequest request = PricingRequest.builder()
                .desiredMargin(new BigDecimal("20.00"))
                .build();

        assertThrows(InvalidFinancialCalculationException.class, () -> pricingService.calculatePricing(request, userId));
    }

    @Test
    void shouldInheritMarginAndTaxFromProductCategory() {
        UUID productId = UUID.randomUUID();
        Category category = Category.builder()
                .id(UUID.randomUUID())
                .name("Bebidas")
                .slug("bebidas")
                .build();
        com.example.margemAI.model.Product product = com.example.margemAI.model.Product.builder()
                .id(productId)
                .name("Refrigerante")
                .baseCost(new BigDecimal("50.00"))
                .category(category)
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(product));
        when(categoryService.resolveParameters(category))
                .thenReturn(new CategoryParameters(new BigDecimal("25.00"), new BigDecimal("6.00"), null, null));

        PricingRequest request = PricingRequest.builder()
                .productId(productId)
                .includeFixedCosts(false)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("25.00"), response.getDesiredMargin());
        assertEquals(new BigDecimal("72.46"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("4.35"), response.getEstimatedTaxes());
    }

    @Test
    void shouldPreferExplicitMarginOverCategoryInheritance() {
        UUID productId = UUID.randomUUID();
        Category category = Category.builder()
                .id(UUID.randomUUID())
                .name("Bebidas")
                .slug("bebidas")
                .build();
        com.example.margemAI.model.Product product = com.example.margemAI.model.Product.builder()
                .id(productId)
                .name("Refrigerante")
                .baseCost(new BigDecimal("50.00"))
                .category(category)
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(product));

        PricingRequest request = PricingRequest.builder()
                .productId(productId)
                .desiredMargin(new BigDecimal("10.00"))
                .includeFixedCosts(false)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertEquals(new BigDecimal("10.00"), response.getDesiredMargin());
        assertEquals(new BigDecimal("55.56"), response.getMinimumSellingPrice());
    }

    @Test
    void shouldUseEffectiveBaseCostFromLinkedVariableCosts() {
        UUID productId = UUID.randomUUID();
        com.example.margemAI.model.Product product = com.example.margemAI.model.Product.builder()
                .id(productId)
                .name("Camiseta")
                .baseCost(new BigDecimal("10.00"))
                .build();

        com.example.margemAI.model.VariableCost cost1 = com.example.margemAI.model.VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Tecido")
                .unitAmount(new BigDecimal("20.00"))
                .category(com.example.margemAI.model.VariableCostCategory.MATERIA_PRIMA)
                .productId(productId)
                .active(true)
                .build();
        com.example.margemAI.model.VariableCost cost2 = com.example.margemAI.model.VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Etiqueta")
                .unitAmount(new BigDecimal("10.00"))
                .category(com.example.margemAI.model.VariableCostCategory.EMBALAGEM)
                .productId(productId)
                .active(true)
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(product));
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId))
                .thenReturn(java.util.List.of(cost1, cost2));

        PricingRequest request = PricingRequest.builder()
                .productId(productId)
                .desiredMargin(new BigDecimal("25.00"))
                .includeFixedCosts(false)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertEquals(new BigDecimal("30.00"), response.getBaseCost());
        assertEquals(new BigDecimal("40.00"), response.getMinimumSellingPrice());
    }

    @Test
    void shouldUseAutomaticFixedCostPercentFromProfile() {
        UUID productId = UUID.randomUUID();
        com.example.margemAI.model.Product product = com.example.margemAI.model.Product.builder()
                .id(productId)
                .name("Refrigerante")
                .baseCost(new BigDecimal("50.00"))
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(product));
        when(variableCostRepository.findByProductIdAndUserIdAndActiveTrue(productId, userId))
                .thenReturn(java.util.List.of());
        when(fixedCostProfileService.getEffectiveFixedCostPercent(userId))
                .thenReturn(new BigDecimal("10.00"));

        PricingRequest request = PricingRequest.builder()
                .productId(productId)
                .desiredMargin(new BigDecimal("25.00"))
                .includeFixedCosts(true)
                .useAutomaticFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertEquals(new BigDecimal("76.92"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("7.69"), response.getAllocatedFixedCosts());
    }

    @Test
    void shouldInheritVariableCostPercentFromCategory() {
        UUID productId = UUID.randomUUID();
        Category category = Category.builder()
                .id(UUID.randomUUID())
                .name("Bebidas")
                .slug("bebidas")
                .build();
        com.example.margemAI.model.Product product = com.example.margemAI.model.Product.builder()
                .id(productId)
                .name("Refrigerante")
                .baseCost(new BigDecimal("50.00"))
                .category(category)
                .build();

        when(productRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), any(UUID.class)))
                .thenReturn(Optional.of(product));
        when(categoryService.resolveParameters(category))
                .thenReturn(new CategoryParameters(null, null, null, new BigDecimal("5.00")));

        PricingRequest request = PricingRequest.builder()
                .productId(productId)
                .desiredMargin(new BigDecimal("25.00"))
                .includeFixedCosts(false)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertEquals(new BigDecimal("71.43"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("3.57"), response.getTotalVariableCosts());
    }

    @Test
    void shouldSimulateDiscountSuccessfullyWithHealthyProfit() {
        SimulateDiscountRequest request = SimulateDiscountRequest.builder()
                .sellingPrice(new BigDecimal("100.00"))
                .discountPercentage(new BigDecimal("10.00"))
                .baseCost(new BigDecimal("40.00"))
                .fixedCostPercent(new BigDecimal("10.00"))
                .variableCostPercent(new BigDecimal("10.00"))
                .build();

        SimulateDiscountResponse response = pricingService.simulateDiscount(request);

        assertNotNull(response);
        assertEquals(new BigDecimal("100.00"), response.getOriginalPrice());
        assertEquals(new BigDecimal("10.00"), response.getDiscount());
        assertEquals(new BigDecimal("90.00"), response.getDiscountedPrice());
        assertTrue(response.getViable());
        assertTrue(response.getDiscountedProfit().compareTo(BigDecimal.ZERO) > 0);
        assertTrue(response.getRecommendation().contains("Operação recomendada"));
    }

    @Test
    void shouldSimulateDiscountAndDetectFinancialLoss() {
        SimulateDiscountRequest request = SimulateDiscountRequest.builder()
                .sellingPrice(new BigDecimal("100.00"))
                .discountPercentage(new BigDecimal("50.00"))
                .baseCost(new BigDecimal("60.00"))
                .fixedCostPercent(new BigDecimal("10.00"))
                .variableCostPercent(new BigDecimal("10.00"))
                .build();

        SimulateDiscountResponse response = pricingService.simulateDiscount(request);

        assertNotNull(response);
        assertEquals(new BigDecimal("50.00"), response.getDiscountedPrice());
        assertFalse(response.getViable());
        assertTrue(response.getDiscountedProfit().compareTo(BigDecimal.ZERO) < 0);
        assertTrue(response.getRecommendation().contains("Alerta SEBRAE"));
    }

    @Test
    void shouldSimulateDiscountAndWarnLowMargin() {
        SimulateDiscountRequest request = SimulateDiscountRequest.builder()
                .sellingPrice(new BigDecimal("100.00"))
                .discountPercentage(new BigDecimal("15.00"))
                .baseCost(new BigDecimal("70.00"))
                .fixedCostPercent(new BigDecimal("5.00"))
                .variableCostPercent(new BigDecimal("5.00"))
                .build();

        SimulateDiscountResponse response = pricingService.simulateDiscount(request);

        assertNotNull(response);
        assertTrue(response.getViable());
        assertTrue(response.getRecommendation().contains("Atenção SEBRAE"));
    }
}
