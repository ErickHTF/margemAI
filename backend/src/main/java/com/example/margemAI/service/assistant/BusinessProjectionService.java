package com.example.margemAI.service.assistant;

import com.example.margemAI.dto.response.BusinessProjectionResponse;
import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.service.AlertService;
import com.example.margemAI.service.DashboardService;
import com.example.margemAI.service.FixedCostProfileService;
import com.example.margemAI.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Clock;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessProjectionService {

    static final int HISTORY_MONTHS = 6;
    static final int BASE_MONTHS = 3;
    static final BigDecimal MAX_MONTHLY_GROWTH = new BigDecimal("0.05");
    private static final MathContext MC = MathContext.DECIMAL64;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final DashboardService dashboardService;
    private final FixedCostProfileService fixedCostProfileService;
    private final AlertService alertService;
    private final Clock clock;

    public BusinessProjectionResponse project(UUID userId, int months, BigDecimal priceAdjustmentPercent, BigDecimal cardToPixPercent) {
        if (months < 3 || months > 12) {
            throw new AssistantToolException("A projeção deve ter de 3 a 12 meses.");
        }
        BigDecimal priceAdjustment = priceAdjustmentPercent != null ? priceAdjustmentPercent : BigDecimal.ZERO;
        BigDecimal cardToPix = cardToPixPercent != null ? cardToPixPercent : BigDecimal.ZERO;
        if (priceAdjustment.compareTo(new BigDecimal("-50")) < 0 || priceAdjustment.compareTo(HUNDRED) > 0) {
            throw new AssistantToolException("O ajuste de preço deve ficar entre -50% e 100%.");
        }
        if (cardToPix.signum() < 0 || cardToPix.compareTo(HUNDRED) > 0) {
            throw new AssistantToolException("A migração do cartão para o Pix deve ficar entre 0% e 100%.");
        }

        YearMonth current = YearMonth.now(clock);
        List<MonthlyFlowEntry> history = dashboardService
                .getMonthlyFlow(userId, HISTORY_MONTHS, current.minusMonths(1).toString())
                .getMonths();
        List<MonthlyFlowEntry> active = history.stream()
                .dropWhile(entry -> entry.getRevenue().signum() == 0)
                .toList();
        if (active.isEmpty()) {
            throw new AssistantToolException("Ainda não há vendas nos últimos meses completos para projetar. "
                    + "Registre as vendas de pelo menos um mês inteiro.");
        }

        List<MonthlyFlowEntry> base = active.subList(Math.max(0, active.size() - BASE_MONTHS), active.size());
        BigDecimal baseRevenue = sum(base, MonthlyFlowEntry::getRevenue).divide(BigDecimal.valueOf(base.size()), MC);
        BigDecimal variableRatio = ratio(sum(base, MonthlyFlowEntry::getVariableCosts), sum(base, MonthlyFlowEntry::getRevenue));
        BigDecimal feeRatio = ratio(sum(base, MonthlyFlowEntry::getPaymentFees), sum(base, MonthlyFlowEntry::getRevenue));
        BigDecimal fixedCosts = fixedCostProfileService.getSummary(userId).getTotalFixedCosts();
        BigDecimal growth = active.size() >= 3 ? clampedGrowth(active, baseRevenue) : BigDecimal.ZERO;

        BigDecimal priceFactor = BigDecimal.ONE.add(priceAdjustment.divide(HUNDRED, MC));
        BigDecimal feeFactor = BigDecimal.ONE.subtract(cardToPix.divide(HUNDRED, MC));

        MeiCapResponse meiCap = alertService.getMeiCapStatus(userId, null);
        BigDecimal yearRevenue = meiCap.getAccumulatedRevenue();
        String capReachMonth = null;

        List<BusinessProjectionResponse.Month> projected = new ArrayList<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalResult = BigDecimal.ZERO;
        BigDecimal baselineTotal = BigDecimal.ZERO;
        for (int i = 1; i <= months; i++) {
            YearMonth month = current.plusMonths(i);
            BigDecimal volumeRevenue = baseRevenue.multiply(BigDecimal.ONE.add(growth).pow(i, MC), MC);
            BigDecimal variable = volumeRevenue.multiply(variableRatio, MC);

            BigDecimal revenue = volumeRevenue.multiply(priceFactor, MC);
            BigDecimal expenses = fixedCosts.add(variable).add(revenue.multiply(feeRatio, MC).multiply(feeFactor, MC));
            BigDecimal result = revenue.subtract(expenses);
            BigDecimal baselineResult = volumeRevenue.subtract(fixedCosts).subtract(variable)
                    .subtract(volumeRevenue.multiply(feeRatio, MC));

            projected.add(new BusinessProjectionResponse.Month(month.toString(), Money.round(revenue),
                    Money.round(expenses), Money.round(result), Money.round(baselineResult)));
            totalRevenue = totalRevenue.add(revenue);
            totalResult = totalResult.add(result);
            baselineTotal = baselineTotal.add(baselineResult);

            if (month.getYear() == current.getYear()) {
                yearRevenue = yearRevenue.add(revenue);
                if (capReachMonth == null && yearRevenue.compareTo(meiCap.getAnnualLimit()) > 0) {
                    capReachMonth = month.toString();
                }
            }
        }

        BigDecimal growthPercent = Money.round(growth.multiply(HUNDRED));
        return new BusinessProjectionResponse(projected, Money.round(totalRevenue), Money.round(totalResult),
                Money.round(baselineTotal), growthPercent, Money.round(priceAdjustment), Money.round(cardToPix),
                meiCap.getAnnualLimit(), Money.round(yearRevenue), capReachMonth,
                assumptions(base.size(), active.size(), growthPercent, fixedCosts, variableRatio, feeRatio,
                        priceAdjustment, cardToPix));
    }

    // Tendência linear do faturamento nos meses com dados, relativa à média base e limitada a ±5% ao mês
    private static BigDecimal clampedGrowth(List<MonthlyFlowEntry> active, BigDecimal baseRevenue) {
        int n = active.size();
        BigDecimal meanX = BigDecimal.valueOf(n - 1).divide(BigDecimal.valueOf(2), MC);
        BigDecimal meanY = sum(active, MonthlyFlowEntry::getRevenue).divide(BigDecimal.valueOf(n), MC);
        BigDecimal numerator = BigDecimal.ZERO;
        BigDecimal denominator = BigDecimal.ZERO;
        for (int x = 0; x < n; x++) {
            BigDecimal dx = BigDecimal.valueOf(x).subtract(meanX);
            numerator = numerator.add(dx.multiply(active.get(x).getRevenue().subtract(meanY), MC));
            denominator = denominator.add(dx.multiply(dx));
        }
        BigDecimal slope = numerator.divide(denominator, MC);
        BigDecimal relative = slope.divide(baseRevenue, MC);
        return relative.max(MAX_MONTHLY_GROWTH.negate()).min(MAX_MONTHLY_GROWTH);
    }

    private static List<String> assumptions(int baseMonths, int activeMonths, BigDecimal growthPercent, BigDecimal fixedCosts,
                                            BigDecimal variableRatio, BigDecimal feeRatio,
                                            BigDecimal priceAdjustment, BigDecimal cardToPix) {
        List<String> list = new ArrayList<>();
        list.add("Faturamento base: média dos últimos " + baseMonths + " meses completos com vendas.");
        list.add(activeMonths >= 3
                ? "Tendência de " + growthPercent.toPlainString() + "% ao mês, calculada sobre " + activeMonths
                + " meses e limitada a ±5%."
                : "Sem tendência: há menos de 3 meses de vendas para medir.");
        list.add("Custos fixos mensais cadastrados hoje: R$ " + Money.round(fixedCosts).toPlainString() + ".");
        list.add("Custos variáveis de " + Money.round(variableRatio.multiply(HUNDRED)).toPlainString()
                + "% e taxas de " + Money.round(feeRatio.multiply(HUNDRED)).toPlainString()
                + "% do faturamento, como nos meses base.");
        if (priceAdjustment.signum() != 0) {
            list.add("Cenário com preços " + (priceAdjustment.signum() > 0 ? "+" : "") + priceAdjustment.toPlainString()
                    + "% e a mesma quantidade vendida.");
        }
        if (cardToPix.signum() != 0) {
            list.add("Cenário com " + cardToPix.toPlainString() + "% das taxas de cartão evitadas por vendas migradas para o Pix.");
        }
        list.add("Projeção é estimativa: não considera sazonalidade, novos produtos ou mudanças de custo.");
        return list;
    }

    private static BigDecimal ratio(BigDecimal part, BigDecimal whole) {
        return whole.signum() == 0 ? BigDecimal.ZERO : part.divide(whole, MC);
    }

    private static BigDecimal sum(List<MonthlyFlowEntry> entries, java.util.function.Function<MonthlyFlowEntry, BigDecimal> field) {
        return entries.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
