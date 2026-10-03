package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
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
public class BreakEvenRequest {

    private UUID productId;

    @DecimalMin(value = "0.01", message = "O preço de venda unitário deve ser maior que zero.")
    private BigDecimal sellingPrice;

    @DecimalMin(value = "0.00", message = "O custo variável unitário não pode ser negativo.")
    private BigDecimal unitVariableCost;

    @DecimalMin(value = "0.00", message = "O total de custos fixos não pode ser negativo.")
    private BigDecimal totalFixedCosts;
}
