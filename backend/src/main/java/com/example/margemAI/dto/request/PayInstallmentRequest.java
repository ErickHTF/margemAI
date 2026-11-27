package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayInstallmentRequest {

    @DecimalMin(value = "0.01", message = "O valor pago deve ser maior que zero.")
    @Digits(integer = 15, fraction = 2, message = "O valor pago deve ter no máximo duas casas decimais.")
    private BigDecimal paidAmount;

    private LocalDate paymentDate;

    @Size(max = 255, message = "As observações devem ter no máximo 255 caracteres.")
    private String notes;
}
