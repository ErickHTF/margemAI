package com.example.margemAI.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
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
public class ProfileUpdateRequest {

    @Size(min = 2, max = 150, message = "O nome deve ter entre 2 e 150 caracteres.")
    private String name;

    private String segment;

    @DecimalMin(value = "0.0", message = "O teto anual deve ser um valor maior ou igual a zero.")
    private BigDecimal customAnnualCap;
}
