package com.example.margemAI.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record BusinessProjectionResponse(
        List<Month> months,
        BigDecimal totalRevenue,
        BigDecimal totalResult,
        BigDecimal baselineTotalResult,
        BigDecimal monthlyGrowthPercent,
        BigDecimal priceAdjustmentPercent,
        BigDecimal cardToPixPercent,
        BigDecimal annualLimit,
        BigDecimal projectedYearRevenue,
        String capReachMonth,
        List<String> assumptions
) {

    public record Month(String month, BigDecimal revenue, BigDecimal expenses, BigDecimal result, BigDecimal baselineResult) {
    }
}
