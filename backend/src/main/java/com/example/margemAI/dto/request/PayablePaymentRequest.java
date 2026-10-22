package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class PayablePaymentRequest {

    @NotNull(message = "O valor do pagamento é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor do pagamento deve ser maior que zero.")
    private BigDecimal amount;

    private LocalDateTime paidAt;

    @Size(max = 500, message = "As observações devem ter no máximo 500 caracteres.")
    private String notes;
}
