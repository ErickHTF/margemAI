package com.example.margemAI.dto.request;

import com.example.margemAI.model.PayableType;
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
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayableAccountRequest {

    @NotBlank(message = "A descrição da conta a pagar é obrigatória.")
    @Size(max = 200, message = "A descrição deve ter no máximo 200 caracteres.")
    private String description;

    @Size(max = 50, message = "A categoria deve ter no máximo 50 caracteres.")
    private String category;

    @NotNull(message = "A data de vencimento é obrigatória.")
    private LocalDate dueDate;

    @NotNull(message = "O valor total é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor total deve ser maior que zero.")
    private BigDecimal totalAmount;

    private PayableType type;

    @Size(max = 7, message = "A competência deve estar no formato AAAA-MM.")
    private String competency;

    private UUID fixedCostId;

    @Size(max = 500, message = "As observações devem ter no máximo 500 caracteres.")
    private String notes;
}
