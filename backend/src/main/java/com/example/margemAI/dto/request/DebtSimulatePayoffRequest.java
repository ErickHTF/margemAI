package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
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
public class DebtSimulatePayoffRequest {

    @Min(value = 1, message = "A quantidade de parcelas a antecipar deve ser no mínimo 1.")
    private Integer installmentsToAnticipate;

    @DecimalMin(value = "0.01", message = "O valor disponível para amortização deve ser maior que zero.")
    @Digits(integer = 15, fraction = 2, message = "O valor para amortização deve ter no máximo duas casas decimais.")
    private BigDecimal amortizeAmount;

    @DecimalMin(value = "0.00", message = "A taxa de desconto mensal não pode ser negativa.")
    @Digits(integer = 3, fraction = 4, message = "A taxa de desconto deve ter no máximo 4 casas decimais.")
    private BigDecimal monthlyDiscountRate;

    private LocalDate simulationDate;
}
