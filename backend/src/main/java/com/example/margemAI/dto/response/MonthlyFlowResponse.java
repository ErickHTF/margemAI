package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyFlowResponse {

    private String startMonth;
    private String endMonth;
    private List<MonthlyFlowEntry> months;
    private BigDecimal totalRevenue;
    private BigDecimal totalExpenses;
    private BigDecimal totalFixedCosts;
    private BigDecimal totalVariableCosts;
    private BigDecimal totalPaymentFees;
    private BigDecimal balance;
    private BigDecimal averageRevenue;
    private BigDecimal averageExpenses;
    private String bestMonth;
    private String worstMonth;
}
