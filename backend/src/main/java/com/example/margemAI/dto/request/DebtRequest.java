package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class DebtRequest {

    @NotBlank(message = "O credor é obrigatório.")
    @Size(min = 1, max = 150, message = "O credor deve ter entre 1 e 150 caracteres.")
    private String creditor;

    @Size(max = 255, message = "A descrição deve ter no máximo 255 caracteres.")
    private String description;

    @NotNull(message = "O valor principal é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor principal deve ser maior que zero.")
    @Digits(integer = 15, fraction = 2, message = "O valor principal deve ter no máximo duas casas decimais.")
    private BigDecimal principalAmount;

    @NotNull(message = "A taxa de juros mensal é obrigatória.")
    @DecimalMin(value = "0.00", message = "A taxa de juros não pode ser negativa.")
    @Digits(integer = 3, fraction = 4, message = "A taxa de juros deve ter no máximo 4 casas decimais.")
    private BigDecimal monthlyInterestRate;

    @DecimalMin(value = "0.00", message = "As tarifas fixas não podem ser negativas.")
    @Digits(integer = 15, fraction = 2, message = "As tarifas fixas devem ter no máximo duas casas decimais.")
    private BigDecimal fixedFeesAmount;

    @NotNull(message = "O total de parcelas é obrigatório.")
    @Min(value = 1, message = "O contrato deve ter pelo menos 1 parcela.")
    @Max(value = 480, message = "O número máximo de parcelas é 480.")
    private Integer totalInstallments;

    @DecimalMin(value = "0.01", message = "O valor da parcela deve ser maior que zero.")
    @Digits(integer = 15, fraction = 2, message = "O valor da parcela deve ter no máximo duas casas decimais.")
    private BigDecimal installmentAmount;

    @NotNull(message = "A data de vencimento da primeira parcela é obrigatória.")
    private LocalDate firstDueDate;
}
