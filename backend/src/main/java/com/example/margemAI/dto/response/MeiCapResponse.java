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
public class MeiCapResponse {

    private BigDecimal annualLimit;
    private boolean proRata;
    private int activeMonths;
    private BigDecimal monthlyCap;
    private BigDecimal accumulatedRevenue;
    private BigDecimal usagePercent;
    private BigDecimal remainingAmount;
    private String severity;
    private String recommendationMessage;
    private boolean simulationMode;
}
