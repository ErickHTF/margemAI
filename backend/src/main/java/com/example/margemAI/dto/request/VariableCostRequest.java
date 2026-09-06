package com.example.margemAI.dto.request;

import com.example.margemAI.model.VariableCostCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariableCostRequest {

    @Size(min = 1, max = 200, message = "O nome do custo deve ter entre 1 e 200 caracteres.")
    private String name;

    @DecimalMin(value = "0.01", message = "O valor unitário deve ser maior que zero.")
    @Digits(integer = 10, fraction = 2, message = "O valor deve ter no máximo duas casas decimais.")
    private BigDecimal unitAmount;

    private VariableCostCategory category;

    private UUID productId;
}
