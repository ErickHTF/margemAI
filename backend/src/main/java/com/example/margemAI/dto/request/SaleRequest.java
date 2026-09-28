package com.example.margemAI.dto.request;

import com.example.margemAI.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleRequest {

    private UUID productId;

    @Size(max = 200, message = "A descrição do item deve ter no máximo 200 caracteres.")
    private String description;

    @NotNull(message = "A quantidade é obrigatória.")
    @DecimalMin(value = "0.01", message = "A quantidade deve ser maior que zero.")
    private BigDecimal quantity;

    @DecimalMin(value = "0.01", message = "O preço unitário deve ser maior que zero.")
    private BigDecimal unitPrice;

    @NotNull(message = "O método de pagamento é obrigatório.")
    private PaymentMethod paymentMethod;

    @Min(value = 1, message = "O número de parcelas deve ser de no mínimo 1.")
    @Builder.Default
    private Integer installments = 1;

    @DecimalMin(value = "0.00", message = "A taxa percentual não pode ser negativa.")
    @DecimalMax(value = "100.00", message = "A taxa percentual não pode exceder 100%.")
    private BigDecimal customFeePercentage;

    private LocalDateTime soldAt;

    @Size(max = 500, message = "As observações devem ter no máximo 500 caracteres.")
    private String notes;
}
