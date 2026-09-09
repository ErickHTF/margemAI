package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class PricingRequest {

    private UUID productId;

    @DecimalMin(value = "0.00", message = "O custo base deve ser maior ou igual a zero")
    private BigDecimal baseCost;

    @Builder.Default
    @DecimalMin(value = "0.00", message = "O percentual de custos fixos não pode ser negativo")
    @DecimalMax(value = "99.99", message = "O percentual de custos fixos deve ser menor que 100%")
    private BigDecimal fixedCostPercent = BigDecimal.ZERO;

    @Builder.Default
    @DecimalMin(value = "0.00", message = "O percentual de custos variáveis não pode ser negativo")
    @DecimalMax(value = "99.99", message = "O percentual de custos variáveis deve ser menor que 100%")
    private BigDecimal variableCostPercent = BigDecimal.ZERO;

    @NotNull(message = "A margem de lucro desejada é obrigatória")
    @DecimalMin(value = "0.00", message = "A margem de lucro desejada não pode ser negativa")
    @DecimalMax(value = "99.99", message = "A margem de lucro desejada deve ser menor que 100%")
    private BigDecimal desiredMargin;

    @Builder.Default
    private Boolean includeFixedCosts = true;
}
