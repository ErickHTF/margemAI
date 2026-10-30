package com.example.margemAI.service.assistant;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.example.margemAI.dto.request.BreakEvenRequest;
import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.AssistantCard;
import com.example.margemAI.dto.response.CategoryResponse;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.dto.response.ProductResponse;
import com.example.margemAI.dto.response.SaleSummaryResponse;
import com.example.margemAI.dto.response.VariableCostResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
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
import com.example.margemAI.util.Money;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class AssistantTools {

    public static final String LIST_PRODUCTS = "listar_produtos";
    public static final String CALCULATE_PRICE = "calcular_preco_ideal";
    public static final String SIMULATE_DISCOUNT = "simular_desconto";
    public static final String BREAK_EVEN = "ponto_de_equilibrio";
    public static final String MONTHLY_FLOW = "fluxo_de_caixa_mensal";
    public static final String MEI_CAP = "teto_mei";
    public static final String FIXED_COSTS_SUMMARY = "resumo_custos_fixos";
    public static final String PAYMENT_FEES = "taxas_pagamento";
    public static final String SALES_SUMMARY = "resumo_vendas";
    public static final String VARIABLE_COSTS = "custos_variaveis";
    public static final String PRICE_STANDARDS = "padroes_de_preco";
    public static final String PROJECTION = "projecao_futura";
    public static final String DIAGNOSIS = "diagnostico_negocio";

    private static final int DEFAULT_SALES_DAYS = 90;

    public static final Map<String, String> LABELS = Map.ofEntries(
            Map.entry(LIST_PRODUCTS, "Catálogo de produtos"),
            Map.entry(CALCULATE_PRICE, "Calculadora Markup (SEBRAE)"),
            Map.entry(SIMULATE_DISCOUNT, "Simulador de desconto"),
            Map.entry(BREAK_EVEN, "Ponto de equilíbrio"),
            Map.entry(MONTHLY_FLOW, "Fluxo de caixa mensal"),
            Map.entry(MEI_CAP, "Teto de faturamento MEI"),
            Map.entry(FIXED_COSTS_SUMMARY, "Resumo de custos fixos"),
            Map.entry(PAYMENT_FEES, "Taxas de pagamento configuradas"),
            Map.entry(SALES_SUMMARY, "Vendas por forma de pagamento"),
            Map.entry(VARIABLE_COSTS, "Custos variáveis"),
            Map.entry(PRICE_STANDARDS, "Padrões de preço"),
            Map.entry(PROJECTION, "Projeção dos próximos meses"),
            Map.entry(DIAGNOSIS, "Diagnóstico do negócio")
    );

    private final ProductService productService;
    private final PricingService pricingService;
    private final DashboardService dashboardService;
    private final AlertService alertService;
    private final FixedCostProfileService fixedCostProfileService;
    private final PaymentMethodConfigService paymentMethodConfigService;
    private final SaleService saleService;
    private final VariableCostService variableCostService;
    private final CategoryService categoryService;
    private final BusinessProjectionService projectionService;
    private final BusinessDiagnosisService diagnosisService;
    private final Clock clock;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final List<Tool> definitions;

    public AssistantTools(ProductService productService,
                          PricingService pricingService,
                          DashboardService dashboardService,
                          AlertService alertService,
                          FixedCostProfileService fixedCostProfileService,
                          PaymentMethodConfigService paymentMethodConfigService,
                          SaleService saleService,
                          VariableCostService variableCostService,
                          CategoryService categoryService,
                          BusinessProjectionService projectionService,
                          BusinessDiagnosisService diagnosisService,
                          Clock clock,
                          ObjectMapper objectMapper,
                          Validator validator) {
        this.productService = productService;
        this.pricingService = pricingService;
        this.dashboardService = dashboardService;
        this.alertService = alertService;
        this.fixedCostProfileService = fixedCostProfileService;
        this.paymentMethodConfigService = paymentMethodConfigService;
        this.saleService = saleService;
        this.variableCostService = variableCostService;
        this.categoryService = categoryService;
        this.projectionService = projectionService;
        this.diagnosisService = diagnosisService;
        this.clock = clock;
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.definitions = buildDefinitions();
    }

    public List<Tool> definitions() {
        return definitions;
    }

    public record ToolResult(String content, boolean error, AssistantCard card) {

        public ToolResult(String content, boolean error) {
            this(content, error, null);
        }
    }

    public ToolResult run(String name, JsonValue input, UUID userId) {
        try {
            Object result = execute(name, input.convert(Map.class), userId);
            return new ToolResult(toJson(result), false, new AssistantCard(name, LABELS.get(name), result));
        } catch (AssistantToolException | InvalidRequestException | ResourceNotFoundException
                 | InvalidFinancialCalculationException | IllegalArgumentException ex) {
            return new ToolResult("Erro: " + ex.getMessage(), true);
        }
    }

    private Object execute(String name, Map<String, Object> args, UUID userId) {
        return switch (name) {
            case LIST_PRODUCTS -> listProducts(userId, (String) args.get("busca"));
            case CALCULATE_PRICE -> pricingService.calculatePricing(read(args, PricingRequest.class), userId);
            case SIMULATE_DISCOUNT -> pricingService.simulateDiscount(read(args, SimulateDiscountRequest.class));
            case BREAK_EVEN -> pricingService.calculateBreakEven(read(args, BreakEvenRequest.class), userId);
            case MONTHLY_FLOW -> dashboardService.getMonthlyFlow(userId,
                    args.get("months") instanceof Number months ? months.intValue() : null,
                    (String) args.get("endMonth"));
            case MEI_CAP -> alertService.getMeiCapStatus(userId, null);
            case FIXED_COSTS_SUMMARY -> fixedCostProfileService.getSummary(userId);
            case PAYMENT_FEES -> paymentMethodConfigService.getMatrixForUser(userId).stream()
                    .filter(config -> !Boolean.FALSE.equals(config.getIsActive()))
                    .map(this::summarize)
                    .toList();
            case SALES_SUMMARY -> salesSummary(userId,
                    args.get("dias") instanceof Number days ? days.intValue() : DEFAULT_SALES_DAYS);
            case VARIABLE_COSTS -> variableCostService.findAll(userId, null, null, 0, 100).getContent().stream()
                    .map(this::summarize)
                    .toList();
            case PRICE_STANDARDS -> categoryService.findAll(userId, null, true, null, 0, 100).getContent().stream()
                    .map(this::summarize)
                    .toList();
            case PROJECTION -> projectionService.project(userId,
                    args.get("meses") instanceof Number months ? months.intValue() : 6,
                    decimal(args.get("ajustePrecoPercentual")),
                    decimal(args.get("migrarCartaoParaPixPercentual")));
            case DIAGNOSIS -> diagnosisService.diagnose(userId);
            default -> throw new AssistantToolException("Ferramenta desconhecida: " + name);
        };
    }

    private List<Map<String, Object>> listProducts(UUID userId, String search) {
        return productService.findAll(userId, null, search, true, 0, 50).getContent().stream()
                .map(this::summarize)
                .toList();
    }

    private Map<String, Object> salesSummary(UUID userId, int days) {
        if (days < 1 || days > 365) {
            throw new AssistantToolException("O período de vendas deve ser de 1 a 365 dias.");
        }
        LocalDateTime end = LocalDateTime.now(clock);
        LocalDateTime start = end.minusDays(days);
        SaleSummaryResponse total = saleService.findAll(userId, start, end, null, null, 0, 1);

        List<Map<String, Object>> byMethod = new ArrayList<>();
        for (PaymentMethod method : PaymentMethod.values()) {
            SaleSummaryResponse partial = saleService.findAll(userId, start, end, method, null, 0, 1);
            if (partial.getTotalSalesCount() == 0) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("formaPagamento", method.name());
            row.put("quantidadeVendas", partial.getTotalSalesCount());
            row.put("faturamentoBruto", partial.getTotalGrossRevenue());
            row.put("taxasPagas", partial.getTotalFeeAmount());
            row.put("taxaEfetivaPercentual", Money.percentageOf(partial.getTotalFeeAmount(), partial.getTotalGrossRevenue()));
            row.put("participacaoNoFaturamentoPercentual", Money.percentageOf(partial.getTotalGrossRevenue(), total.getTotalGrossRevenue()));
            byMethod.add(row);
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("periodoDias", days);
        summary.put("quantidadeVendas", total.getTotalSalesCount());
        summary.put("faturamentoBruto", total.getTotalGrossRevenue());
        summary.put("taxasPagas", total.getTotalFeeAmount());
        summary.put("faturamentoLiquido", total.getTotalNetRevenue());
        summary.put("porFormaDePagamento", byMethod);
        return summary;
    }

    private Map<String, Object> summarize(PaymentMethodConfigResponse config) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("formaPagamento", config.getPaymentMethod());
        summary.put("parcelas", config.getInstallments());
        summary.put("taxaPercentual", config.getMdrFeePercent());
        summary.put("tarifaFixa", config.getFixedFeeAmount());
        summary.put("prazoRecebimentoDias", config.getSettlementDays());
        summary.put("personalizada", config.getIsCustomized());
        summary.put("taxaPercentualRecomendada", config.getDefaultMdrFeePercent());
        return summary;
    }

    private Map<String, Object> summarize(VariableCostResponse cost) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("nome", cost.getName());
        summary.put("valorPorUnidade", cost.getUnitAmount());
        summary.put("categoria", cost.getCategory());
        summary.put("produto", cost.getProductName());
        return summary;
    }

    private Map<String, Object> summarize(CategoryResponse category) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("nome", category.getName());
        summary.put("tipo", category.getType());
        summary.put("margemAlvoPercentual", category.getTargetProfitMargin());
        summary.put("impostosPercentual", category.getTaxRate());
        summary.put("descontoMaximoPercentual", category.getMaxDiscountAllowed());
        summary.put("despesasVariaveisPercentual", category.getVariableCostPercent());
        return summary;
    }

    private Map<String, Object> summarize(ProductResponse product) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("productId", product.getId());
        summary.put("nome", product.getName());
        summary.put("tipo", product.getType());
        summary.put("custoBase", product.getBaseCost());
        summary.put("custoBaseEfetivo", product.getEffectiveBaseCost());
        summary.put("precoVenda", product.getSellingPrice());
        summary.put("margemPercentual", product.getMarginPercentage());
        summary.put("margemAlvoPercentual", product.getTargetProfitMargin());
        summary.put("padraoDePreco", product.getCategoryName());
        return summary;
    }

    private static BigDecimal decimal(Object value) {
        return value instanceof Number number ? new BigDecimal(number.toString()) : null;
    }

    private <T> T read(Map<String, Object> args, Class<T> type) {
        T request = objectMapper.convertValue(args, type);
        Set<ConstraintViolation<T>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new AssistantToolException(violations.stream()
                    .map(ConstraintViolation::getMessage)
                    .sorted()
                    .collect(Collectors.joining(" ")));
        }
        return request;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new AssistantToolException("Não foi possível ler o resultado do cálculo.");
        }
    }

    private static List<Tool> buildDefinitions() {
        return List.of(
                tool(LIST_PRODUCTS,
                        "Lista os produtos e serviços ativos do catálogo do MEI com custo, preço de venda e margem. "
                                + "Use para descobrir o productId antes de calcular preço ou ponto de equilíbrio de um item citado pelo nome.",
                        Map.of("busca", prop("string", "Trecho do nome do produto para filtrar (opcional).")),
                        List.of()),
                tool(CALCULATE_PRICE,
                        "Calcula o preço de venda ideal pelo método de markup do SEBRAE usando o motor de precificação do sistema. "
                                + "Informe productId para usar custos e parâmetros cadastrados do produto, ou baseCost para um custo avulso. "
                                + "Percentuais são números de 0 a 99.99 calculados sobre o preço de venda.",
                        Map.of(
                                "productId", prop("string", "ID do produto (obtido em listar_produtos)."),
                                "baseCost", prop("number", "Custo de aquisição ou produção por unidade, em reais."),
                                "desiredMargin", prop("number", "Margem de lucro desejada em %."),
                                "variableCostPercent", prop("number", "Despesas variáveis em % do preço (comissões, embalagem etc.)."),
                                "taxRate", prop("number", "Alíquota de impostos em % do preço."),
                                "fixedCostPercent", prop("number", "Custos fixos em % do preço, quando o MEI informa manualmente."),
                                "useAutomaticFixedCosts", prop("boolean", "true para ratear automaticamente os custos fixos cadastrados.")),
                        List.of()),
                tool(SIMULATE_DISCOUNT,
                        "Simula o impacto de um desconto no lucro de uma venda e diz se ele continua viável.",
                        Map.of(
                                "baseCost", prop("number", "Custo unitário em reais."),
                                "sellingPrice", prop("number", "Preço de venda original em reais."),
                                "discountPercentage", prop("number", "Desconto em % (0 a 100)."),
                                "fixedCostPercent", prop("number", "Custos fixos em % do preço (opcional)."),
                                "variableCostPercent", prop("number", "Custos variáveis em % do preço (opcional).")),
                        List.of("sellingPrice", "discountPercentage")),
                tool(BREAK_EVEN,
                        "Calcula o ponto de equilíbrio: quantas unidades e quanto faturamento cobrem os custos fixos. "
                                + "Informe productId para usar os dados cadastrados, ou os valores avulsos.",
                        Map.of(
                                "productId", prop("string", "ID do produto (obtido em listar_produtos)."),
                                "sellingPrice", prop("number", "Preço de venda unitário em reais."),
                                "unitVariableCost", prop("number", "Custo variável por unidade em reais."),
                                "totalFixedCosts", prop("number", "Total de custos fixos mensais em reais.")),
                        List.of()),
                tool(MONTHLY_FLOW,
                        "Retorna a evolução mensal de receitas, custos fixos, custos variáveis, taxas e resultado do MEI.",
                        Map.of(
                                "months", prop("integer", "Quantidade de meses (6 a 12). Padrão 6."),
                                "endMonth", prop("string", "Último mês no formato AAAA-MM. Padrão: mês atual.")),
                        List.of()),
                tool(MEI_CAP,
                        "Mostra quanto do teto anual de faturamento do MEI já foi usado, quanto resta e o nível de alerta.",
                        Map.of(),
                        List.of()),
                tool(FIXED_COSTS_SUMMARY,
                        "Resume os custos fixos mensais cadastrados e o percentual de rateio sobre o faturamento.",
                        Map.of(),
                        List.of()),
                tool(PAYMENT_FEES,
                        "Lista as taxas de maquininha configuradas por forma de pagamento e parcelas, com prazo de "
                                + "recebimento e a taxa recomendada para comparação.",
                        Map.of(),
                        List.of()),
                tool(SALES_SUMMARY,
                        "Resume as vendas de um período: faturamento bruto e líquido, taxas pagas e, por forma de "
                                + "pagamento, a participação no faturamento e a taxa efetiva paga.",
                        Map.of("dias", prop("integer", "Quantidade de dias até hoje (1 a 365). Padrão 90.")),
                        List.of()),
                tool(VARIABLE_COSTS,
                        "Lista os custos variáveis por unidade (embalagem, matéria-prima, frete) vinculados aos produtos.",
                        Map.of(),
                        List.of()),
                tool(PRICE_STANDARDS,
                        "Lista os padrões de preço com margem alvo, impostos, desconto máximo e despesas variáveis.",
                        Map.of(),
                        List.of()),
                tool(PROJECTION,
                        "Projeta faturamento, despesas e resultado dos próximos meses a partir do histórico real, "
                                + "com a data estimada em que o teto do MEI seria atingido. Aceita cenários \"e se\": "
                                + "ajuste de preço e migração de vendas do cartão para o Pix. Devolve as hipóteses usadas.",
                        Map.of(
                                "meses", prop("integer", "Horizonte da projeção em meses (3 a 12). Padrão 6."),
                                "ajustePrecoPercentual", prop("number", "Cenário: variação dos preços em % (-50 a 100), mantendo a quantidade vendida."),
                                "migrarCartaoParaPixPercentual", prop("number", "Cenário: % das taxas de cartão evitadas migrando vendas para o Pix (0 a 100).")),
                        List.of()),
                tool(DIAGNOSIS,
                        "Faz o diagnóstico completo do negócio: nota de 0 a 100 e situação (OK, ATENCAO, CRITICO) de "
                                + "preços contra o preço mínimo, taxas de maquininha, resultado mensal, custos fixos e teto do MEI. "
                                + "Use primeiro em pedidos de análise geral.",
                        Map.of(),
                        List.of())
        );
    }

    private static Map<String, Object> prop(String type, String description) {
        return Map.of("type", type, "description", description);
    }

    private static Tool tool(String name, String description, Map<String, Map<String, Object>> properties, List<String> required) {
        Tool.InputSchema.Properties.Builder props = Tool.InputSchema.Properties.builder();
        properties.forEach((key, schema) -> props.putAdditionalProperty(key, JsonValue.from(schema)));
        return Tool.builder()
                .name(name)
                .description(description)
                .inputSchema(Tool.InputSchema.builder()
                        .properties(props.build())
                        .required(required)
                        .build())
                .build();
    }
}
