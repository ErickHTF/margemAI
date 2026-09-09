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
public class SimulateDiscountRequest {

    private UUID productId;

    private BigDecimal baseCost;

    @NotNull(message = "O preço de venda original é obrigatório")
    @DecimalMin(value = "0.01", message = "O preço de venda deve ser maior que zero")
    private BigDecimal sellingPrice;

    @NotNull(message = "O percentual de desconto é obrigatório")
    @DecimalMin(value = "0.00", message = "O percentual de desconto não pode ser negativo")
    @DecimalMax(value = "100.00", message = "O percentual de desconto não pode ultrapassar 100%")
    private BigDecimal discountPercentage;

    @Builder.Default
    @DecimalMin(value = "0.00", message = "O percentual de custos fixos não pode ser negativo")
    private BigDecimal fixedCostPercent = BigDecimal.ZERO;

    @Builder.Default
    @DecimalMin(value = "0.00", message = "O percentual de custos variáveis não pode ser negativo")
    private BigDecimal variableCostPercent = BigDecimal.ZERO;
}
