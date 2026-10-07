package com.example.margemAI.dto.request;

import com.example.margemAI.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class PaymentMethodConfigRequest {

    @NotNull(message = "O método de pagamento é obrigatório.")
    private PaymentMethod paymentMethod;

    @Min(value = 1, message = "O número de parcelas deve ser de no mínimo 1.")
    @Max(value = 12, message = "O número de parcelas deve ser de no máximo 12.")
    @Builder.Default
    private Integer installments = 1;

    @NotNull(message = "A taxa MDR é obrigatória.")
    @DecimalMin(value = "0.00", message = "A taxa MDR não pode ser negativa.")
    @DecimalMax(value = "99.99", message = "A taxa MDR não pode ser superior a 99.99%.")
    @Builder.Default
    private BigDecimal mdrFeePercent = BigDecimal.ZERO;

    @DecimalMin(value = "0.00", message = "A tarifa fixa não pode ser negativa.")
    @Builder.Default
    private BigDecimal fixedFeeAmount = BigDecimal.ZERO;

    @Min(value = 0, message = "O prazo de liquidação não pode ser negativo.")
    @Max(value = 365, message = "O prazo de liquidação não pode ser superior a 365 dias.")
    @Builder.Default
    private Integer settlementDays = 0;

    @Builder.Default
    private Boolean isActive = true;
}
