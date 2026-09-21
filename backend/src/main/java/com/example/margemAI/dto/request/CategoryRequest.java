package com.example.margemAI.dto.request;

import com.example.margemAI.model.ItemType;
import jakarta.validation.constraints.DecimalMax;
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
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {

    @NotBlank(message = "O nome da categoria é obrigatório.")
    @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres.")
    private String name;

    @NotNull(message = "O tipo (PRODUTO ou SERVICO) é obrigatório.")
    private ItemType type;

    @DecimalMin(value = "0.01", message = "A margem de lucro desejada deve ser no mínimo 0.01%.")
    @DecimalMax(value = "99.99", message = "A margem de lucro desejada deve ser menor que 100%.")
    private BigDecimal targetProfitMargin;

    @DecimalMin(value = "0.00", message = "A alíquota tributária não pode ser negativa.")
    @DecimalMax(value = "99.99", message = "A alíquota tributária deve ser menor que 100%.")
    private BigDecimal taxRate;

    @DecimalMin(value = "0.00", message = "O teto de desconto não pode ser negativo.")
    @DecimalMax(value = "100.00", message = "O teto de desconto não pode ser superior a 100%.")
    private BigDecimal maxDiscountAllowed;

    private UUID parentId;
}
