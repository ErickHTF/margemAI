package com.example.margemAI.service.assistant;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.response.BusinessDiagnosisResponse;
import com.example.margemAI.dto.response.BusinessDiagnosisResponse.Indicator;
import com.example.margemAI.dto.response.BusinessDiagnosisResponse.Status;
import com.example.margemAI.dto.response.FixedCostsSummaryResponse;
import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.dto.response.MonthlyFlowResponse;
import com.example.margemAI.dto.response.PaginatedResponse;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.ProductResponse;
import com.example.margemAI.dto.response.SaleSummaryResponse;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.service.AlertService;
import com.example.margemAI.service.DashboardService;
import com.example.margemAI.service.FixedCostProfileService;
import com.example.margemAI.service.PaymentMethodConfigService;
import com.example.margemAI.service.PricingService;
import com.example.margemAI.service.ProductService;
import com.example.margemAI.service.SaleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessDiagnosisServiceTest {

    @Mock private ProductService productService;
    @Mock private PricingService pricingService;
    @Mock private SaleService saleService;
    @Mock private PaymentMethodConfigService paymentMethodConfigService;
    @Mock private DashboardService dashboardService;
    @Mock private FixedCostProfileService fixedCostProfileService;
    @Mock private AlertService alertService;

    private BusinessDiagnosisService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new BusinessDiagnosisService(productService, pricingService, saleService, paymentMethodConfigService,
                dashboardService, fixedCostProfileService, alertService,
                Clock.fixed(Instant.parse("2026-10-21T12:00:00Z"), ZoneOffset.UTC));
        userId = UUID.randomUUID();
    }

    private static ProductResponse product(UUID id, String name, String price) {
        return ProductResponse.builder().id(id).name(name).sellingPrice(new BigDecimal(price)).build();
    }

    private void products(ProductResponse... items) {
        when(productService.findAll(userId, null, null, true, 0, 50))
                .thenReturn(PaginatedResponse.<ProductResponse>builder().content(List.of(items)).build());
    }

    private void minimumPrice(UUID productId, String minimum) {
        when(pricingService.calculatePricing(argThat((PricingRequest request) -> request != null && productId.equals(request.getProductId())), eq(userId)))
                .thenReturn(PricingResponse.builder().minimumSellingPrice(new BigDecimal(minimum)).build());
    }

    private static MonthlyFlowEntry flow(String month, String revenue, String expenses) {
        BigDecimal r = new BigDecimal(revenue);
        BigDecimal e = new BigDecimal(expenses);
        return MonthlyFlowEntry.builder().month(month).revenue(r).totalExpenses(e).balance(r.subtract(e)).build();
    }

    @Test
    @DisplayName("Deve marcar preços como atenção e listar os produtos vendidos abaixo do preço mínimo")
    void shouldFlagProductsBelowMinimumPrice() {
        UUID acai = UUID.randomUUID();
        UUID shake = UUID.randomUUID();
        UUID copo = UUID.randomUUID();
        products(product(acai, "Açaí 500ml", "18.00"), product(shake, "Milkshake", "15.00"), product(copo, "Copo 300ml", "12.50"));
        minimumPrice(acai, "21.40");
        minimumPrice(shake, "13.10");
        minimumPrice(copo, "11.90");

        Indicator prices = service.prices(userId);

        assertEquals(Status.ATENCAO, prices.status());
        assertEquals("1 de 3 abaixo do preço mínimo", prices.value());
        assertEquals(List.of("Açaí 500ml: vende a R$ 18,00, mínimo R$ 21,40"), prices.items());
    }

    @Test
    @DisplayName("Deve marcar preços como crítico quando mais da metade dos produtos está abaixo do mínimo")
    void shouldBeCriticalWhenMostProductsAreBelowMinimum() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        products(product(a, "Bolo", "30.00"), product(b, "Torta", "40.00"));
        minimumPrice(a, "35.00");
        minimumPrice(b, "41.00");

        assertEquals(Status.CRITICO, service.prices(userId).status());
    }

    @Test
    @DisplayName("Deve apontar taxa configurada acima da recomendada e mostrar a taxa efetiva das vendas")
    void shouldFlagFeeAboveRecommended() {
        when(saleService.findAll(eq(userId), any(), any(), isNull(), isNull(), eq(0), eq(1)))
                .thenReturn(SaleSummaryResponse.builder().totalSalesCount(40L)
                        .totalGrossRevenue(new BigDecimal("4200.00")).totalFeeAmount(new BigDecimal("117.60"))
                        .totalNetRevenue(new BigDecimal("4082.40")).build());
        when(paymentMethodConfigService.getMatrixForUser(userId)).thenReturn(List.of(
                PaymentMethodConfigResponse.builder().paymentMethod(PaymentMethod.CREDITO_A_VISTA).description("Crédito à Vista")
                        .installments(1).isActive(true).mdrFeePercent(new BigDecimal("4.20")).defaultMdrFeePercent(new BigDecimal("3.20")).build(),
                PaymentMethodConfigResponse.builder().paymentMethod(PaymentMethod.DEBITO).description("Débito")
                        .installments(1).isActive(true).mdrFeePercent(new BigDecimal("1.50")).defaultMdrFeePercent(new BigDecimal("1.50")).build()));

        Indicator fees = service.paymentFees(userId);

        assertEquals(Status.ATENCAO, fees.status());
        assertEquals("R$ 117,60 em 90 dias (2,80% do faturamento)", fees.value());
        assertEquals(List.of("Crédito à Vista: 4,20% (recomendado 3,20%)"), fees.items());
    }

    @Test
    @DisplayName("Deve marcar o resultado como crítico quando o último mês fechou no negativo")
    void shouldBeCriticalWhenLastMonthIsNegative() {
        when(dashboardService.getMonthlyFlow(userId, BusinessDiagnosisService.RESULT_MONTHS, "2026-09"))
                .thenReturn(MonthlyFlowResponse.builder().months(List.of(
                        flow("2026-07", "0", "0"),
                        flow("2026-08", "3100", "2400"),
                        flow("2026-09", "1800", "2050"))).build());

        Indicator result = service.monthlyResult(userId);

        assertEquals(Status.CRITICO, result.status());
        assertEquals("1 de 2 meses no negativo", result.value());
    }

    @Test
    @DisplayName("Deve calcular a nota pela média dos indicadores avaliados, ignorando os sem dados")
    void shouldScoreFromRatedIndicators() {
        products();
        when(saleService.findAll(eq(userId), any(), any(), isNull(), isNull(), eq(0), eq(1)))
                .thenReturn(SaleSummaryResponse.builder().totalSalesCount(10L)
                        .totalGrossRevenue(new BigDecimal("1000.00")).totalFeeAmount(new BigDecimal("15.00")).build());
        when(paymentMethodConfigService.getMatrixForUser(userId)).thenReturn(List.of());
        when(dashboardService.getMonthlyFlow(userId, BusinessDiagnosisService.RESULT_MONTHS, "2026-09"))
                .thenReturn(MonthlyFlowResponse.builder().months(List.of(flow("2026-09", "1000", "700"))).build());
        when(fixedCostProfileService.getSummary(userId)).thenReturn(FixedCostsSummaryResponse.builder()
                .totalFixedCosts(new BigDecimal("600.00")).severeRisk(true).riskMessage("Custos fixos pesam demais.").build());
        when(alertService.getMeiCapStatus(userId, null)).thenReturn(MeiCapResponse.builder()
                .severity("WARNING").usagePercent(new BigDecimal("87.00")).accumulatedRevenue(new BigDecimal("70470.00"))
                .annualLimit(new BigDecimal("81000.00")).recommendationMessage("Atenção ao teto.").build());

        BusinessDiagnosisResponse diagnosis = service.diagnose(userId);

        assertEquals(Status.SEM_DADOS, diagnosis.indicators().get(0).status());
        assertEquals(63, diagnosis.score());
        assertEquals("Atenção", diagnosis.level());
        assertTrue(diagnosis.indicators().get(3).detail().contains("pesam demais"));
    }
}
