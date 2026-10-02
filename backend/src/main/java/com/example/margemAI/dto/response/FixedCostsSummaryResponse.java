package com.example.margemAI.dto.response;

import com.example.margemAI.model.RevenueBaselineMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FixedCostsSummaryResponse {
    private BigDecimal totalFixedCosts;
    private BigDecimal revenueBaseline;
    private RevenueBaselineMode revenueBaselineMode;
    private BigDecimal allocatedFixedCostPercent;
    private Boolean automaticRateio;
    private Boolean severeRisk;
    private String riskMessage;
    private LocalDateTime lastRecalculatedAt;
}
