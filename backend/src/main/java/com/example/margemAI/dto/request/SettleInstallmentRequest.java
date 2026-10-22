package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
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
public class SettleInstallmentRequest {

    @DecimalMin(value = "0.01", message = "O valor da baixa deve ser maior que zero.")
    private BigDecimal amount;

    private LocalDate receivedAt;

    @Size(max = 500, message = "As observações não podem ter mais de 500 caracteres.")
    private String notes;
}
