package com.example.margemAI.service;

import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.dto.response.MonthlyFlowResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.VariableCostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    public static final int DEFAULT_MONTHS = 6;
    public static final int MIN_MONTHS = 6;
    public static final int MAX_MONTHS = 12;

    private final SaleRepository saleRepository;
    private final FixedCostRepository fixedCostRepository;
    private final VariableCostRepository variableCostRepository;

    @Transactional(readOnly = true)
    public MonthlyFlowResponse getMonthlyFlow(UUID userId, Integer months, String endMonth) {
        int period = months != null ? months : DEFAULT_MONTHS;
        if (period < MIN_MONTHS || period > MAX_MONTHS) {
            throw new InvalidRequestException("O período deve ser entre " + MIN_MONTHS + " e " + MAX_MONTHS + " meses.");
        }

        YearMonth end = parseMonth(endMonth);
        YearMonth start = end.minusMonths(period - 1L);

        Map<YearMonth, MonthAccumulator> accumulators = new HashMap<>();
        for (YearMonth month = start; !month.isAfter(end); month = month.plusMonths(1)) {
            accumulators.put(month, new MonthAccumulator());
        }

        Map<UUID, BigDecimal> unitVariableCostByProduct = unitVariableCostByProduct(userId);
        List<Sale> sales = saleRepository.findByUserIdAndSoldAtInPeriod(
                userId,
                start.atDay(1).atStartOfDay(),
                end.plusMonths(1).atDay(1).atStartOfDay()
        );
        for (Sale sale : sales) {
            MonthAccumulator accumulator = accumulators.get(YearMonth.from(sale.getSoldAt()));
            if (accumulator != null) {
                accumulator.addSale(sale, unitVariableCostByProduct);
            }
        }

        List<FixedCost> fixedCosts = fixedCostRepository.findByUserId(userId);
        List<MonthlyFlowEntry> entries = new ArrayList<>();
        for (YearMonth month = start; !month.isAfter(end); month = month.plusMonths(1)) {
            MonthAccumulator accumulator = accumulators.get(month);
            for (FixedCost cost : fixedCosts) {
                if (appliesTo(cost, month)) {
                    accumulator.fixedCosts = accumulator.fixedCosts.add(cost.getAmount());
                }
            }
            entries.add(accumulator.toEntry(month));
        }

        return buildResponse(start, end, entries);
    }

    private YearMonth parseMonth(String value) {
        if (value == null || value.isBlank()) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(value.trim());
        } catch (DateTimeParseException ex) {
            throw new InvalidRequestException("Mês final inválido. Use o formato AAAA-MM.");
        }
    }

    private Map<UUID, BigDecimal> unitVariableCostByProduct(UUID userId) {
        Map<UUID, BigDecimal> totals = new HashMap<>();
        for (VariableCost cost : variableCostRepository.findByUserIdAndActiveTrueAndProductIdIsNotNull(userId)) {
            totals.merge(cost.getProductId(), cost.getUnitAmount(), BigDecimal::add);
        }
        return totals;
    }

    // Custos recorrentes contam a partir do mês de cadastro; os pontuais, no mês de vencimento.
    // Custos desativados deixam de contar após o mês em que foram desativados, preservando o histórico.
    private boolean appliesTo(FixedCost cost, YearMonth month) {
        boolean recurring = !Boolean.FALSE.equals(cost.getRecurring());
        YearMonth first;
        YearMonth last;

        if (recurring) {
            first = cost.getCreatedAt() != null ? YearMonth.from(cost.getCreatedAt()) : null;
            last = null;
        } else {
            YearMonth reference = cost.getDueDate() != null
                    ? YearMonth.from(cost.getDueDate())
                    : cost.getCreatedAt() != null ? YearMonth.from(cost.getCreatedAt()) : null;
            if (reference == null) {
                return false;
            }
            first = reference;
            last = reference;
        }

        if (Boolean.FALSE.equals(cost.getActive())) {
            if (cost.getUpdatedAt() == null) {
                return false;
            }
            YearMonth deactivated = YearMonth.from(cost.getUpdatedAt());
            if (last == null || deactivated.isBefore(last)) {
                last = deactivated;
            }
        }

        return (first == null || !month.isBefore(first)) && (last == null || !month.isAfter(last));
    }

    private MonthlyFlowResponse buildResponse(YearMonth start, YearMonth end, List<MonthlyFlowEntry> entries) {
        BigDecimal totalRevenue = entries.stream().map(MonthlyFlowEntry::getRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalExpenses = entries.stream().map(MonthlyFlowEntry::getTotalExpenses).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalFixedCosts = entries.stream().map(MonthlyFlowEntry::getFixedCosts).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalVariableCosts = entries.stream().map(MonthlyFlowEntry::getVariableCosts).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalPaymentFees = entries.stream().map(MonthlyFlowEntry::getPaymentFees).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal size = BigDecimal.valueOf(entries.size());

        boolean hasActivity = entries.stream().anyMatch(entry ->
                entry.getRevenue().signum() != 0 || entry.getTotalExpenses().signum() != 0);

        String bestMonth = null;
        String worstMonth = null;
        if (hasActivity) {
            bestMonth = entries.stream().max(Comparator.comparing(MonthlyFlowEntry::getBalance)).map(MonthlyFlowEntry::getMonth).orElse(null);
            worstMonth = entries.stream().min(Comparator.comparing(MonthlyFlowEntry::getBalance)).map(MonthlyFlowEntry::getMonth).orElse(null);
        }

        return MonthlyFlowResponse.builder()
                .startMonth(start.toString())
                .endMonth(end.toString())
                .months(entries)
                .totalRevenue(scale(totalRevenue))
                .totalExpenses(scale(totalExpenses))
                .totalFixedCosts(scale(totalFixedCosts))
                .totalVariableCosts(scale(totalVariableCosts))
                .totalPaymentFees(scale(totalPaymentFees))
                .balance(scale(totalRevenue.subtract(totalExpenses)))
                .averageRevenue(totalRevenue.divide(size, 2, RoundingMode.HALF_UP))
                .averageExpenses(totalExpenses.divide(size, 2, RoundingMode.HALF_UP))
                .bestMonth(bestMonth)
                .worstMonth(worstMonth)
                .build();
    }

    private static BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static final class MonthAccumulator {
        private BigDecimal revenue = BigDecimal.ZERO;
        private BigDecimal fixedCosts = BigDecimal.ZERO;
        private BigDecimal variableCosts = BigDecimal.ZERO;
        private BigDecimal paymentFees = BigDecimal.ZERO;
        private int salesCount;

        private void addSale(Sale sale, Map<UUID, BigDecimal> unitVariableCostByProduct) {
            revenue = revenue.add(sale.getGrossAmount());
            paymentFees = paymentFees.add(sale.getFeeAmount() != null ? sale.getFeeAmount() : BigDecimal.ZERO);
            salesCount++;
            if (sale.getProduct() != null) {
                BigDecimal unitCost = unitVariableCostByProduct.getOrDefault(sale.getProduct().getId(), BigDecimal.ZERO);
                variableCosts = variableCosts.add(unitCost.multiply(sale.getQuantity()));
            }
        }

        private MonthlyFlowEntry toEntry(YearMonth month) {
            BigDecimal totalExpenses = fixedCosts.add(variableCosts).add(paymentFees);
            return MonthlyFlowEntry.builder()
                    .month(month.toString())
                    .revenue(scale(revenue))
                    .salesCount(salesCount)
                    .fixedCosts(scale(fixedCosts))
                    .variableCosts(scale(variableCosts))
                    .paymentFees(scale(paymentFees))
                    .totalExpenses(scale(totalExpenses))
                    .balance(scale(revenue.subtract(totalExpenses)))
                    .build();
        }
    }
}
