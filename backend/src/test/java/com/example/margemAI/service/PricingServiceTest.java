package com.example.margemAI.service;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PricingServiceTest {

    private PricingService pricingService;

    @BeforeEach
    void setUp() {
        pricingService = new PricingService();
    }

    @Test
    void shouldCalculatePricingSuccessfullyWithStandardSebraeMarkup() {
        PricingRequest request = PricingRequest.builder()
                .productId(UUID.randomUUID())
                .baseCost(new BigDecimal("18.50"))
                .fixedCostPercent(new BigDecimal("10.00"))
                .variableCostPercent(new BigDecimal("15.00"))
                .desiredMargin(new BigDecimal("25.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request);

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

        PricingResponse response = pricingService.calculatePricing(request);

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

        assertThrows(InvalidFinancialCalculationException.class, () -> pricingService.calculatePricing(request));
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

        PricingResponse response = pricingService.calculatePricing(request);

        assertNotNull(response);
        assertTrue(response.getMinimumSellingPrice().compareTo(BigDecimal.ZERO) > 0);
    }

    @Test
    void shouldThrowExceptionWhenBaseCostIsNull() {
        PricingRequest request = PricingRequest.builder()
                .desiredMargin(new BigDecimal("20.00"))
                .build();

        assertThrows(InvalidFinancialCalculationException.class, () -> pricingService.calculatePricing(request));
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
