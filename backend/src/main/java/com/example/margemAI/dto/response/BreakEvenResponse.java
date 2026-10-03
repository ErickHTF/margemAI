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
public class BreakEvenResponse {

    private BigDecimal sellingPrice;
    private BigDecimal unitVariableCost;
    private BigDecimal totalFixedCosts;
    private BigDecimal unitContributionMargin;
    private BigDecimal contributionMarginRatio;
    private Long breakEvenQuantity;
    private BigDecimal breakEvenRevenue;
    private boolean viable;
    private String recommendation;
}
