package com.example.margemAI.service.assistant;

import com.anthropic.core.JsonValue;
import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SaleSummaryResponse;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.service.AlertService;
import com.example.margemAI.service.CategoryService;
import com.example.margemAI.service.DashboardService;
import com.example.margemAI.service.FixedCostProfileService;
import com.example.margemAI.service.PaymentMethodConfigService;
import com.example.margemAI.service.PricingService;
import com.example.margemAI.service.ProductService;
import com.example.margemAI.service.SaleService;
import com.example.margemAI.service.VariableCostService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssistantToolsTest {

    @Mock private ProductService productService;
    @Mock private PricingService pricingService;
    @Mock private DashboardService dashboardService;
    @Mock private AlertService alertService;
    @Mock private FixedCostProfileService fixedCostProfileService;
    @Mock private PaymentMethodConfigService paymentMethodConfigService;
    @Mock private SaleService saleService;
    @Mock private VariableCostService variableCostService;
    @Mock private CategoryService categoryService;
    @Mock private BusinessProjectionService projectionService;
    @Mock private BusinessDiagnosisService diagnosisService;

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private AssistantTools tools;
    private UUID userId;

    @BeforeEach
    void setUp() {
        tools = new AssistantTools(productService, pricingService, dashboardService, alertService,
                fixedCostProfileService, paymentMethodConfigService, saleService, variableCostService,
                categoryService, projectionService, diagnosisService, Clock.fixed(Instant.parse("2026-10-21T12:00:00Z"), ZoneOffset.UTC),
                objectMapper, Validation.buildDefaultValidatorFactory().getValidator());
        userId = UUID.randomUUID();
    }

    private JsonNode json(String content) throws Exception {
        return objectMapper.readTree(content);
    }

    @Test
    @DisplayName("Deve calcular o preço ideal com o produto informado e o usuário logado")
    void shouldCalculatePriceForAuthenticatedUser() throws Exception {
        UUID productId = UUID.randomUUID();
        when(pricingService.calculatePricing(any(PricingRequest.class), eq(userId)))
                .thenReturn(PricingResponse.builder().minimumSellingPrice(new BigDecimal("41.37")).build());

        AssistantTools.ToolResult result = tools.run(AssistantTools.CALCULATE_PRICE,
                JsonValue.from(Map.of("productId", productId.toString(), "desiredMargin", 22.5)), userId);

        assertFalse(result.error());
        assertEquals(AssistantTools.CALCULATE_PRICE, result.card().type());
        assertEquals(0, new BigDecimal("41.37").compareTo(json(result.content()).get("minimumSellingPrice").decimalValue()));
        ArgumentCaptor<PricingRequest> request = ArgumentCaptor.forClass(PricingRequest.class);
        verify(pricingService).calculatePricing(request.capture(), eq(userId));
        assertEquals(productId, request.getValue().getProductId());
        assertEquals(0, new BigDecimal("22.5").compareTo(request.getValue().getDesiredMargin()));
    }

    @Test
    @DisplayName("Deve barrar argumentos inválidos enviados pela IA antes de chamar o cálculo")
    void shouldRejectInvalidArgumentsBeforeCallingService() {
        AssistantTools.ToolResult result = tools.run(AssistantTools.CALCULATE_PRICE,
                JsonValue.from(Map.of("baseCost", 30, "desiredMargin", 150)), userId);

        assertTrue(result.error());
        assertTrue(result.content().contains("menor que 100%"));
        verifyNoInteractions(pricingService);
    }

    @Test
    @DisplayName("Deve resumir vendas por forma de pagamento com taxa efetiva e participação no faturamento")
    void shouldSummarizeSalesByPaymentMethod() throws Exception {
        when(saleService.findAll(eq(userId), any(), any(), isNull(), isNull(), eq(0), eq(1)))
                .thenReturn(summary(10, "1250.00", "36.80", "1213.20"));
        when(saleService.findAll(eq(userId), any(), any(), any(PaymentMethod.class), isNull(), eq(0), eq(1)))
                .thenAnswer(invocation -> switch ((PaymentMethod) invocation.getArgument(3)) {
                    case PIX -> summary(6, "730.00", "0.00", "730.00");
                    case CREDITO_A_VISTA -> summary(4, "520.00", "36.80", "483.20");
                    default -> summary(0, "0", "0", "0");
                });

        AssistantTools.ToolResult result = tools.run(AssistantTools.SALES_SUMMARY,
                JsonValue.from(Map.of("dias", 30)), userId);

        JsonNode body = json(result.content());
        assertEquals(30, body.get("periodoDias").asInt());
        assertEquals(2, body.get("porFormaDePagamento").size());
        JsonNode credit = body.get("porFormaDePagamento").get(1);
        assertEquals("CREDITO_A_VISTA", credit.get("formaPagamento").asText());
        assertEquals(0, new BigDecimal("7.08").compareTo(credit.get("taxaEfetivaPercentual").decimalValue()));
        assertEquals(0, new BigDecimal("41.60").compareTo(credit.get("participacaoNoFaturamentoPercentual").decimalValue()));
    }

    @Test
    @DisplayName("Deve recusar período de vendas fora de 1 a 365 dias")
    void shouldRejectSalesPeriodOutOfRange() {
        AssistantTools.ToolResult result = tools.run(AssistantTools.SALES_SUMMARY,
                JsonValue.from(Map.of("dias", 400)), userId);

        assertTrue(result.error());
        verifyNoInteractions(saleService);
    }

    @Test
    @DisplayName("Deve responder erro para ferramenta desconhecida")
    void shouldReturnErrorForUnknownTool() {
        AssistantTools.ToolResult result = tools.run("apagar_vendas", JsonValue.from(Map.of()), userId);

        assertTrue(result.error());
        assertTrue(result.content().contains("apagar_vendas"));
    }

    @Test
    @DisplayName("Deve ter rótulo em português para toda ferramenta exibida na tela")
    void shouldHaveLabelForEveryTool() {
        tools.definitions().forEach(tool ->
                assertTrue(AssistantTools.LABELS.containsKey(tool.name()), "sem rótulo: " + tool.name()));
    }

    private static SaleSummaryResponse summary(long count, String gross, String fee, String net) {
        return SaleSummaryResponse.builder()
                .totalSalesCount(count)
                .totalGrossRevenue(new BigDecimal(gross))
                .totalFeeAmount(new BigDecimal(fee))
                .totalNetRevenue(new BigDecimal(net))
                .build();
    }
}
