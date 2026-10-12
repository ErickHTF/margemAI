package com.example.margemAI.service;

import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.dto.response.MonthlyFlowResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.Sale;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.util.Money;
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

        List<Sale> sales = saleRepository.findByUserIdAndSoldAtInPeriod(
                userId,
                start.atDay(1).atStartOfDay(),
                end.plusMonths(1).atDay(1).atStartOfDay()
        );
        for (Sale sale : sales) {
            MonthAccumulator accumulator = accumulators.get(YearMonth.from(sale.getSoldAt()));
            if (accumulator != null) {
                accumulator.addSale(sale);
            }
        }

        List<FixedCost> fixedCosts = fixedCostRepository.findByUserId(userId);
        List<MonthlyFlowEntry> entries = new ArrayList<>();
        for (YearMonth month = start; !month.isAfter(end); month = month.plusMonths(1)) {
            MonthAccumulator accumulator = accumulators.get(month);
            for (FixedCost cost : fixedCosts) {
                accumulator.fixedCosts = accumulator.fixedCosts.add(cost.amountForMonth(month));
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
                .totalRevenue(Money.round(totalRevenue))
                .totalExpenses(Money.round(totalExpenses))
                .totalFixedCosts(Money.round(totalFixedCosts))
                .totalVariableCosts(Money.round(totalVariableCosts))
                .totalPaymentFees(Money.round(totalPaymentFees))
                .balance(Money.round(totalRevenue.subtract(totalExpenses)))
                .averageRevenue(totalRevenue.divide(size, 2, RoundingMode.HALF_UP))
                .averageExpenses(totalExpenses.divide(size, 2, RoundingMode.HALF_UP))
                .bestMonth(bestMonth)
                .worstMonth(worstMonth)
                .build();
    }

    private static final class MonthAccumulator {
        private BigDecimal revenue = BigDecimal.ZERO;
        private BigDecimal fixedCosts = BigDecimal.ZERO;
        private BigDecimal variableCosts = BigDecimal.ZERO;
        private BigDecimal paymentFees = BigDecimal.ZERO;
        private int salesCount;

        private void addSale(Sale sale) {
            revenue = revenue.add(sale.getGrossAmount());
            paymentFees = paymentFees.add(sale.getFeeAmount() != null ? sale.getFeeAmount() : BigDecimal.ZERO);
            salesCount++;
            variableCosts = variableCosts.add(sale.getOperationCost() != null ? sale.getOperationCost() : BigDecimal.ZERO);
        }

        private MonthlyFlowEntry toEntry(YearMonth month) {
            BigDecimal totalExpenses = fixedCosts.add(variableCosts).add(paymentFees);
            return MonthlyFlowEntry.builder()
                    .month(month.toString())
                    .revenue(Money.round(revenue))
                    .salesCount(salesCount)
                    .fixedCosts(Money.round(fixedCosts))
                    .variableCosts(Money.round(variableCosts))
                    .paymentFees(Money.round(paymentFees))
                    .totalExpenses(Money.round(totalExpenses))
                    .balance(Money.round(revenue.subtract(totalExpenses)))
                    .build();
        }
    }
}
