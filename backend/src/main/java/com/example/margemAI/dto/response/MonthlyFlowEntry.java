package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyFlowEntry {

    private String month;
    private BigDecimal revenue;
    private int salesCount;
    private BigDecimal fixedCosts;
    private BigDecimal variableCosts;
    private BigDecimal paymentFees;
    private BigDecimal totalExpenses;
    private BigDecimal balance;
}
