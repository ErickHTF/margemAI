package com.example.margemAI.service.assistant;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.response.BusinessDiagnosisResponse;
import com.example.margemAI.dto.response.BusinessDiagnosisResponse.Indicator;
import com.example.margemAI.dto.response.BusinessDiagnosisResponse.Status;
import com.example.margemAI.dto.response.FixedCostsSummaryResponse;
import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.ProductResponse;
import com.example.margemAI.dto.response.SaleSummaryResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.service.AlertService;
import com.example.margemAI.service.DashboardService;
import com.example.margemAI.service.FixedCostProfileService;
import com.example.margemAI.service.PaymentMethodConfigService;
import com.example.margemAI.service.PricingService;
import com.example.margemAI.service.ProductService;
import com.example.margemAI.service.SaleService;
import com.example.margemAI.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessDiagnosisService {

    static final int SALES_DAYS = 90;
    static final int RESULT_MONTHS = 6;
    private static final int MAX_ITEMS = 5;

    private final ProductService productService;
    private final PricingService pricingService;
    private final SaleService saleService;
    private final PaymentMethodConfigService paymentMethodConfigService;
    private final DashboardService dashboardService;
    private final FixedCostProfileService fixedCostProfileService;
    private final AlertService alertService;
    private final Clock clock;

    public BusinessDiagnosisResponse diagnose(UUID userId) {
        List<Indicator> indicators = List.of(
                prices(userId),
                paymentFees(userId),
                monthlyResult(userId),
                fixedCosts(userId),
                meiCap(userId)
        );
        List<Indicator> rated = indicators.stream().filter(indicator -> indicator.status() != Status.SEM_DADOS).toList();
        int score = rated.isEmpty() ? 0 : (int) Math.round(rated.stream()
                .mapToInt(indicator -> switch (indicator.status()) {
                    case OK -> 100;
                    case ATENCAO -> 50;
                    default -> 0;
                })
                .average()
                .orElse(0));
        String level = rated.isEmpty() ? "Sem dados suficientes" : score >= 80 ? "Saudável" : score >= 50 ? "Atenção" : "Crítico";
        return new BusinessDiagnosisResponse(score, level, indicators);
    }

    Indicator prices(UUID userId) {
        List<ProductResponse> products = productService.findAll(userId, null, null, true, 0, 50).getContent();
        List<String> below = new ArrayList<>();
        int checked = 0;
        for (ProductResponse product : products) {
            if (product.getSellingPrice() == null || product.getSellingPrice().signum() <= 0) {
                continue;
            }
            PricingResponse pricing;
            try {
                pricing = pricingService.calculatePricing(PricingRequest.builder().productId(product.getId()).build(), userId);
            } catch (InvalidFinancialCalculationException | InvalidRequestException ex) {
                continue;
            }
            checked++;
            if (pricing.getMinimumSellingPrice() != null
                    && product.getSellingPrice().compareTo(pricing.getMinimumSellingPrice()) < 0) {
                below.add(product.getName() + ": vende a R$ " + brl(product.getSellingPrice())
                        + ", mínimo R$ " + brl(pricing.getMinimumSellingPrice()));
            }
        }
        if (checked == 0) {
            return new Indicator("precos", "Preços dos produtos", Status.SEM_DADOS, "Nenhum produto com preço",
                    "Preço mínimo da Calculadora Markup", "Cadastre produtos com custo e preço de venda.", List.of());
        }
        Status status = below.isEmpty() ? Status.OK : below.size() * 2 > checked ? Status.CRITICO : Status.ATENCAO;
        return new Indicator("precos", "Preços dos produtos", status,
                below.size() + " de " + checked + " abaixo do preço mínimo",
                "Preço mínimo da Calculadora Markup",
                below.isEmpty() ? "Todos os produtos cobrem custos, impostos e margem desejada."
                        : "Vender abaixo do mínimo significa não atingir a margem desejada.",
                below.stream().limit(MAX_ITEMS).toList());
    }

    Indicator paymentFees(UUID userId) {
        LocalDateTime end = LocalDateTime.now(clock);
        SaleSummaryResponse sales = saleService.findAll(userId, end.minusDays(SALES_DAYS), end, null, null, 0, 1);
        List<String> aboveRecommended = paymentMethodConfigService.getMatrixForUser(userId).stream()
                .filter(config -> !Boolean.FALSE.equals(config.getIsActive()))
                .filter(this::aboveRecommended)
                .map(config -> describe(config) + ": " + percent(config.getMdrFeePercent())
                        + " (recomendado " + percent(config.getDefaultMdrFeePercent()) + ")")
                .toList();
        if (sales.getTotalSalesCount() == 0) {
            return new Indicator("taxas", "Taxas de maquininha", aboveRecommended.isEmpty() ? Status.SEM_DADOS : Status.ATENCAO,
                    "Sem vendas nos últimos " + SALES_DAYS + " dias", "Taxas recomendadas da plataforma",
                    aboveRecommended.isEmpty() ? "Registre vendas para medir quanto as taxas pesam."
                            : "Há taxas configuradas acima da recomendada.",
                    aboveRecommended.stream().limit(MAX_ITEMS).toList());
        }
        BigDecimal effective = Money.percentageOf(sales.getTotalFeeAmount(), sales.getTotalGrossRevenue());
        return new Indicator("taxas", "Taxas de maquininha", aboveRecommended.isEmpty() ? Status.OK : Status.ATENCAO,
                "R$ " + brl(sales.getTotalFeeAmount()) + " em " + SALES_DAYS + " dias (" + percent(effective) + " do faturamento)",
                "Taxas recomendadas da plataforma",
                aboveRecommended.isEmpty() ? "Suas taxas estão dentro das recomendadas."
                        : "Negociar essas taxas com a maquininha aumenta o que sobra de cada venda.",
                aboveRecommended.stream().limit(MAX_ITEMS).toList());
    }

    Indicator monthlyResult(UUID userId) {
        List<MonthlyFlowEntry> months = dashboardService
                .getMonthlyFlow(userId, RESULT_MONTHS, YearMonth.now(clock).minusMonths(1).toString())
                .getMonths().stream()
                .filter(entry -> entry.getRevenue().signum() != 0 || entry.getTotalExpenses().signum() != 0)
                .toList();
        if (months.isEmpty()) {
            return new Indicator("resultado", "Resultado mensal", Status.SEM_DADOS, "Sem movimento nos últimos meses",
                    "Receitas menos despesas de cada mês", "Registre vendas e custos para acompanhar o resultado.", List.of());
        }
        List<String> negative = months.stream()
                .filter(entry -> entry.getBalance().signum() < 0)
                .map(entry -> entry.getMonth() + ": R$ " + brl(entry.getBalance()))
                .toList();
        boolean lastNegative = months.get(months.size() - 1).getBalance().signum() < 0;
        Status status = lastNegative ? Status.CRITICO : negative.isEmpty() ? Status.OK : Status.ATENCAO;
        return new Indicator("resultado", "Resultado mensal", status,
                negative.size() + " de " + months.size() + " meses no negativo",
                "Receitas menos despesas de cada mês",
                lastNegative ? "O último mês fechou no negativo." : negative.isEmpty()
                        ? "Todos os meses recentes fecharam no positivo." : "Houve meses no negativo recentemente.",
                negative.stream().limit(MAX_ITEMS).toList());
    }

    Indicator fixedCosts(UUID userId) {
        FixedCostsSummaryResponse summary = fixedCostProfileService.getSummary(userId);
        if (summary.getTotalFixedCosts() == null || summary.getTotalFixedCosts().signum() == 0) {
            return new Indicator("custos_fixos", "Custos fixos", Status.SEM_DADOS, "Nenhum custo fixo cadastrado",
                    "Peso dos custos fixos no faturamento", "Cadastre aluguel, DAS, energia e outros custos mensais.", List.of());
        }
        boolean severe = Boolean.TRUE.equals(summary.getSevereRisk());
        String share = summary.getAllocatedFixedCostPercent() != null ? " (" + percent(summary.getAllocatedFixedCostPercent()) + " do faturamento)" : "";
        return new Indicator("custos_fixos", "Custos fixos", severe ? Status.CRITICO : Status.OK,
                "R$ " + brl(summary.getTotalFixedCosts()) + " por mês" + share,
                "Peso dos custos fixos no faturamento",
                severe && summary.getRiskMessage() != null ? summary.getRiskMessage() : "Os custos fixos cabem no faturamento.",
                List.of());
    }

    Indicator meiCap(UUID userId) {
        MeiCapResponse cap = alertService.getMeiCapStatus(userId, null);
        Status status = switch (cap.getSeverity()) {
            case "CRITICAL" -> Status.CRITICO;
            case "WARNING" -> Status.ATENCAO;
            default -> Status.OK;
        };
        return new Indicator("teto_mei", "Teto do MEI", status,
                percent(cap.getUsagePercent()) + " usado (R$ " + brl(cap.getAccumulatedRevenue()) + " de R$ " + brl(cap.getAnnualLimit()) + ")",
                "Limite anual de faturamento do MEI", cap.getRecommendationMessage(), List.of());
    }

    private boolean aboveRecommended(PaymentMethodConfigResponse config) {
        return config.getMdrFeePercent() != null && config.getDefaultMdrFeePercent() != null
                && config.getMdrFeePercent().compareTo(config.getDefaultMdrFeePercent()) > 0;
    }

    private static String describe(PaymentMethodConfigResponse config) {
        String name = config.getDescription() != null ? config.getDescription() : String.valueOf(config.getPaymentMethod());
        return config.getInstallments() != null && config.getInstallments() > 1 ? name + " " + config.getInstallments() + "x" : name;
    }

    private static String brl(BigDecimal value) {
        return String.format(java.util.Locale.of("pt", "BR"), "%,.2f", Money.round(value));
    }

    private static String percent(BigDecimal value) {
        return Money.round(value).toPlainString().replace('.', ',') + "%";
    }
}
