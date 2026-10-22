package com.example.margemAI.dto.request;

import com.example.margemAI.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
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
public class ReceivableRequest {

    @NotBlank(message = "A descrição do título é obrigatória.")
    @Size(max = 200, message = "A descrição não pode ter mais de 200 caracteres.")
    private String description;

    @NotNull(message = "O valor bruto é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor bruto deve ser maior que zero.")
    private BigDecimal grossAmount;

    @NotNull(message = "A forma de pagamento é obrigatória.")
    private PaymentMethod paymentMethod;

    @Builder.Default
    private Integer installments = 1;

    private BigDecimal customFeePercentage;

    private LocalDate issuedAt;

    @Size(max = 500, message = "As observações não podem ter mais de 500 caracteres.")
    private String notes;
}
