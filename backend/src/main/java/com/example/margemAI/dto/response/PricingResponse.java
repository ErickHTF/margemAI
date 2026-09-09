package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingResponse {

    private UUID productId;
    private String productName;
    private BigDecimal baseCost;
    private BigDecimal totalVariableCosts;
    private BigDecimal allocatedFixedCosts;
    private BigDecimal estimatedTaxes;
    private BigDecimal totalUnitCost;
    private BigDecimal desiredMargin;
    private BigDecimal minimumSellingPrice;
    private BigDecimal markup;
    private BigDecimal unitProfit;
    private BigDecimal grossMargin;
    private BigDecimal contributionMargin;
}
