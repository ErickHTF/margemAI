package com.example.margemAI.dto.response;

import com.example.margemAI.model.FinancialReserve.GoalMode;

import java.math.BigDecimal;
import java.util.List;

public record FinancialReserveResponse(
        GoalMode goalMode,
        BigDecimal targetAmount,
        Integer targetMonths,
        BigDecimal monthlyFixedCosts,
        BigDecimal effectiveTargetAmount,
        boolean missingFixedCostsForMonthsGoal,
        String guidanceMessage,
        BigDecimal currentBalance,
        BigDecimal reservedBalance,
        BigDecimal totalBusinessAccountsBalance,
        BigDecimal freeBalance,
        BigDecimal progressPercent,
        List<ReserveMovementResponse> movements
) {
}
