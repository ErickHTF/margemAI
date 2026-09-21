package com.example.margemAI.dto.request;

import com.example.margemAI.model.RevenueBaselineMode;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RateioConfigRequest {

    private RevenueBaselineMode revenueBaselineMode;

    @DecimalMin(value = "0.00", message = "O faturamento mensal estimado não pode ser negativo.")
    private BigDecimal monthlyRevenueTarget;

    @DecimalMin(value = "0.00", message = "A média histórica de faturamento não pode ser negativa.")
    private BigDecimal historicalAverageRevenue;

    private Boolean automaticRateio;

    @DecimalMin(value = "0.00", message = "O percentual de rateio não pode ser negativo.")
    @DecimalMax(value = "99.99", message = "O percentual de rateio deve ser menor que 100%.")
    private BigDecimal manualAllocatedFixedCostPercent;
}
