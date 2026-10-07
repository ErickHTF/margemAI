package com.example.margemAI.service;

import com.example.margemAI.dto.request.BreakEvenRequest;
import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.BreakEvenResponse;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.VariableCostRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("[TECH-01] Suíte de Precisão Financeira - Metodologia SEBRAE e Alíquotas Simples Nacional")
class SimplesNacionalMarkupPrecisionTest {

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

    private final UUID userId = UUID.randomUUID();

    @Test
    @DisplayName("Deve calcular markup com alíquota real do Simples Nacional Anexo I (Comércio) Faixa 1 (4,00%)")
    void shouldCalculatePricingWithSimplesNacionalAnexoIFaixa1() {
        // Custo Base = R$ 50,00 | Custos Fixos = 15,00% | Custos Variáveis = 10,00% | Margem = 20,00% | Simples = 4,00%
        // Soma % = 15 + 10 + 20 + 4 = 49,00%
        // Markup Denominador = 100 - 49 = 51,00%
        // Preço Mínimo = (50,00 * 100) / 51,00 = 98,0392... -> R$ 98,04
        // Markup Multiplicador = 100 / 51 = 1,9608
        // Custos Fixos Alocados = 98,04 * 15% = R$ 14,71
        // Custos Variáveis = 98,04 * 10% = R$ 9,80
        // Tributos Estimados = 98,04 * 4% = R$ 3,92
        // Custo Total Unitário = 50,00 + 14,71 + 9,80 = R$ 74,51
        // Lucro Unitário = 98,04 - 74,51 = R$ 23,53

        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("50.00"))
                .fixedCostPercent(new BigDecimal("15.00"))
                .variableCostPercent(new BigDecimal("10.00"))
                .desiredMargin(new BigDecimal("20.00"))
                .taxRate(new BigDecimal("4.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("50.00"), response.getBaseCost());
        assertEquals(new BigDecimal("98.04"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("1.96"), response.getMarkup());
        assertEquals(new BigDecimal("14.71"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("9.80"), response.getTotalVariableCosts());
        assertEquals(new BigDecimal("3.92"), response.getEstimatedTaxes());
        assertEquals(new BigDecimal("74.51"), response.getTotalUnitCost());
        assertEquals(new BigDecimal("23.53"), response.getUnitProfit());
        assertEquals(new BigDecimal("49.00"), response.getGrossMargin()); // ((98.04 - 50) * 100) / 98.04
        assertEquals(new BigDecimal("38.24"), response.getContributionMargin()); // 98.04 - (50 + 9.80)
    }

    @Test
    @DisplayName("Deve calcular markup com alíquota real do Simples Nacional Anexo I Faixa 2 (7,30%)")
    void shouldCalculatePricingWithSimplesNacionalAnexoIFaixa2() {
        // Custo Base = R$ 120,00 | Fixos = 12,00% | Variáveis = 8,00% | Margem = 25,00% | Simples = 7,30%
        // Soma % = 12 + 8 + 25 + 7.30 = 52,30%
        // Denominador = 100 - 52.30 = 47,70%
        // Preço Mínimo = (120,00 * 100) / 47,70 = 251,5723... -> R$ 251,57

        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("120.00"))
                .fixedCostPercent(new BigDecimal("12.00"))
                .variableCostPercent(new BigDecimal("8.00"))
                .desiredMargin(new BigDecimal("25.00"))
                .taxRate(new BigDecimal("7.30"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("120.00"), response.getBaseCost());
        assertEquals(new BigDecimal("251.57"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("2.10"), response.getMarkup());
        assertEquals(new BigDecimal("30.19"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("20.13"), response.getTotalVariableCosts());
        assertEquals(new BigDecimal("18.36"), response.getEstimatedTaxes());
        assertEquals(new BigDecimal("170.32"), response.getTotalUnitCost());
        assertEquals(new BigDecimal("81.25"), response.getUnitProfit());
    }

    @Test
    @DisplayName("Deve calcular markup com alíquota real do Simples Nacional Anexo I Faixa 6 (19,00% - Teto Comércio)")
    void shouldCalculatePricingWithSimplesNacionalAnexoIFaixa6Teto() {
        // Custo Base = R$ 200,00 | Fixos = 20,00% | Variáveis = 5,00% | Margem = 15,00% | Simples = 19,00%
        // Soma % = 20 + 5 + 15 + 19 = 59,00%
        // Denominador = 100 - 59 = 41,00%
        // Preço = (200,00 * 100) / 41 = 487,8048... -> R$ 487,80

        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("200.00"))
                .fixedCostPercent(new BigDecimal("20.00"))
                .variableCostPercent(new BigDecimal("5.00"))
                .desiredMargin(new BigDecimal("15.00"))
                .taxRate(new BigDecimal("19.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("200.00"), response.getBaseCost());
        assertEquals(new BigDecimal("487.80"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("2.44"), response.getMarkup());
        assertEquals(new BigDecimal("97.56"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("24.39"), response.getTotalVariableCosts());
        assertEquals(new BigDecimal("92.68"), response.getEstimatedTaxes());
        assertEquals(new BigDecimal("321.95"), response.getTotalUnitCost());
        assertEquals(new BigDecimal("165.85"), response.getUnitProfit());
    }

    @Test
    @DisplayName("Deve calcular markup com alíquota real do Simples Nacional Anexo III (Serviços) Faixa 1 (6,00%)")
    void shouldCalculatePricingWithSimplesNacionalAnexoIIIFaixa1() {
        // Custo Base = R$ 80,00 | Fixos = 18,00% | Variáveis = 6,00% | Margem = 30,00% | Simples = 6,00%
        // Soma % = 18 + 6 + 30 + 6 = 60,00%
        // Denominador = 40,00%
        // Preço = (80 * 100) / 40 = R$ 200,00
        // Markup = 100 / 40 = 2,50

        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("80.00"))
                .fixedCostPercent(new BigDecimal("18.00"))
                .variableCostPercent(new BigDecimal("6.00"))
                .desiredMargin(new BigDecimal("30.00"))
                .taxRate(new BigDecimal("6.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("80.00"), response.getBaseCost());
        assertEquals(new BigDecimal("200.00"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("2.50"), response.getMarkup());
        assertEquals(new BigDecimal("36.00"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("12.00"), response.getTotalVariableCosts());
        assertEquals(new BigDecimal("12.00"), response.getEstimatedTaxes());
        assertEquals(new BigDecimal("128.00"), response.getTotalUnitCost());
        assertEquals(new BigDecimal("72.00"), response.getUnitProfit());
        assertEquals(new BigDecimal("60.00"), response.getGrossMargin());
        assertEquals(new BigDecimal("108.00"), response.getContributionMargin());
    }

    @Test
    @DisplayName("Deve calcular markup com alíquota real do Simples Nacional Anexo III Faixa 6 (33,00% - Teto Serviços)")
    void shouldCalculatePricingWithSimplesNacionalAnexoIIIFaixa6Teto() {
        // Custo Base = R$ 150,00 | Fixos = 10,00% | Variáveis = 5,00% | Margem = 20,00% | Simples = 33,00%
        // Soma % = 10 + 5 + 20 + 33 = 68,00%
        // Denominador = 32,00%
        // Preço = (150 * 100) / 32 = R$ 468,75
        // Markup = 100 / 32 = 3,125 -> 3,13

        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("150.00"))
                .fixedCostPercent(new BigDecimal("10.00"))
                .variableCostPercent(new BigDecimal("5.00"))
                .desiredMargin(new BigDecimal("20.00"))
                .taxRate(new BigDecimal("33.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("150.00"), response.getBaseCost());
        assertEquals(new BigDecimal("468.75"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("3.13"), response.getMarkup());
        assertEquals(new BigDecimal("46.88"), response.getAllocatedFixedCosts());
        assertEquals(new BigDecimal("23.44"), response.getTotalVariableCosts());
        assertEquals(new BigDecimal("154.69"), response.getEstimatedTaxes());
        assertEquals(new BigDecimal("220.32"), response.getTotalUnitCost());
        assertEquals(new BigDecimal("248.43"), response.getUnitProfit());
    }

    @ParameterizedTest(name = "Custo R$ {0}, Fixos {1}%, Var {2}%, Margem {3}%, Simples {4}% -> Preço R$ {5}")
    @CsvSource({
            "10.00, 10.00, 5.00, 15.00, 4.00, 15.15",
            "25.50, 12.50, 7.50, 20.00, 6.00, 47.22",
            "99.99, 15.00, 10.00, 25.00, 9.50, 246.89",
            "350.00, 8.00, 4.00, 18.00, 13.50, 619.47"
    })
    @DisplayName("Deve calcular rigorosamente diferentes cenários paramétricos de alíquotas e margens")
    void shouldCalculateVariousParametricSimplesNacionalScenarios(
            String baseCost, String fixed, String var, String margin, String tax, String expectedPrice) {

        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal(baseCost))
                .fixedCostPercent(new BigDecimal(fixed))
                .variableCostPercent(new BigDecimal(var))
                .desiredMargin(new BigDecimal(margin))
                .taxRate(new BigDecimal(tax))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal(expectedPrice), response.getMinimumSellingPrice());
    }

    @Test
    @DisplayName("Deve rejeitar cálculo quando soma de alíquotas for exatamente igual a 100%")
    void shouldThrowExceptionWhenSumOfPercentagesEqualsExactly100Percent() {
        // Fixos 25% + Variáveis 25% + Margem 25% + Imposto 25% = 100%
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("100.00"))
                .fixedCostPercent(new BigDecimal("25.00"))
                .variableCostPercent(new BigDecimal("25.00"))
                .desiredMargin(new BigDecimal("25.00"))
                .taxRate(new BigDecimal("25.00"))
                .build();

        InvalidFinancialCalculationException exception = assertThrows(
                InvalidFinancialCalculationException.class,
                () -> pricingService.calculatePricing(request, userId)
        );

        assertTrue(exception.getMessage().contains("igual ou superior a 100%"));
    }

    @Test
    @DisplayName("Deve rejeitar cálculo quando soma de alíquotas ultrapassar 100%")
    void shouldThrowExceptionWhenSumOfPercentagesExceeds100Percent() {
        // Fixos 30% + Variáveis 30% + Margem 30% + Imposto 15% = 105%
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("50.00"))
                .fixedCostPercent(new BigDecimal("30.00"))
                .variableCostPercent(new BigDecimal("30.00"))
                .desiredMargin(new BigDecimal("30.00"))
                .taxRate(new BigDecimal("15.00"))
                .build();

        assertThrows(InvalidFinancialCalculationException.class,
                () -> pricingService.calculatePricing(request, userId));
    }

    @Test
    @DisplayName("Deve suportar cálculo no limite extremo de 99,00% de soma percentual")
    void shouldSupportHighPercentageEdgeCaseAt99Percent() {
        // Fixos 30% + Var 30% + Margem 25% + Impostos 14% = 99.00%
        // Denominador = 1.00%
        // Preço = (10.00 * 100) / 1.00 = R$ 1.000,00
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("10.00"))
                .fixedCostPercent(new BigDecimal("30.00"))
                .variableCostPercent(new BigDecimal("30.00"))
                .desiredMargin(new BigDecimal("25.00"))
                .taxRate(new BigDecimal("14.00"))
                .build();

        PricingResponse response = pricingService.calculatePricing(request, userId);

        assertEquals(new BigDecimal("1000.00"), response.getMinimumSellingPrice());
        assertEquals(new BigDecimal("100.0000"), response.getMarkup().setScale(4, RoundingMode.HALF_UP));
    }

    @Test
    @DisplayName("Deve calcular Ponto de Equilíbrio contábil com precisão monetária e margem de contribuição real")
    void shouldCalculateBreakEvenWithFinancialPrecision() {
        // Custos Fixos Totais = R$ 3.000,00
        // Preço de Venda = R$ 50,00 | Custo Variável Unitário = R$ 20,00
        // Margem de Contribuição Unitária = R$ 30,00
        // Índice MC = 30 / 50 = 60,00%
        // Qtd Ponto de Equilíbrio = 100 unidades
        // Faturamento Ponto de Equilíbrio = 3000 / 0.60 = R$ 5.000,00

        BreakEvenRequest request = BreakEvenRequest.builder()
                .totalFixedCosts(new BigDecimal("3000.00"))
                .sellingPrice(new BigDecimal("50.00"))
                .unitVariableCost(new BigDecimal("20.00"))
                .build();

        BreakEvenResponse response = pricingService.calculateBreakEven(request, userId);

        assertNotNull(response);
        assertEquals(new BigDecimal("30.00"), response.getUnitContributionMargin());
        assertEquals(new BigDecimal("60.00"), response.getContributionMarginRatio());
        assertEquals(100L, response.getBreakEvenQuantity());
        assertEquals(new BigDecimal("5000.00"), response.getBreakEvenRevenue());
        assertTrue(response.isViable());
    }

    @Test
    @DisplayName("Deve simular descontos de balcão respeitando piso mínimo e margem líquida")
    void shouldSimulateDiscountsWithPrecision() {
        // Preço Original = R$ 100,00 | Custo Base = R$ 40,00 | Desconto = 15,00%
        // Preço com Desconto = 100 * (1 - 0.15) = R$ 85,00
        // Custos Fixos (0) + Variáveis (0) -> Custo Total = 40,00
        // Lucro Original = 100 - 40 = 60,00 | Margem Original = 60,00%
        // Lucro com Desconto = 85 - 40 = 45,00 | Margem com Desconto = (45 / 85) * 100 = 52,94%

        SimulateDiscountRequest request = SimulateDiscountRequest.builder()
                .sellingPrice(new BigDecimal("100.00"))
                .baseCost(new BigDecimal("40.00"))
                .discountPercentage(new BigDecimal("15.00"))
                .fixedCostPercent(BigDecimal.ZERO)
                .variableCostPercent(BigDecimal.ZERO)
                .build();

        SimulateDiscountResponse response = pricingService.simulateDiscount(request);

        assertNotNull(response);
        assertEquals(new BigDecimal("85.00"), response.getDiscountedPrice());
        assertEquals(new BigDecimal("45.00"), response.getDiscountedProfit());
        assertEquals(new BigDecimal("52.94"), response.getDiscountedMargin());
        assertTrue(response.getViable());
    }
}
