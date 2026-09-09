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
public class SimulateDiscountResponse {

    private BigDecimal originalPrice;
    private BigDecimal discount;
    private BigDecimal discountedPrice;
    private BigDecimal totalCost;
    private BigDecimal originalProfit;
    private BigDecimal discountedProfit;
    private BigDecimal originalMargin;
    private BigDecimal discountedMargin;
    private Boolean viable;
    private String recommendation;
}
