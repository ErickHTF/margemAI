package com.example.margemAI.dto.request;

import com.example.margemAI.model.ItemType;
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

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotBlank(message = "O nome do produto/serviço é obrigatório.")
    @Size(max = 200, message = "O nome deve ter no máximo 200 caracteres.")
    private String name;

    @Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres.")
    private String description;

    @NotNull(message = "O tipo (PRODUTO ou SERVICO) é obrigatório.")
    private ItemType type;

    @DecimalMin(value = "0.00", message = "O custo base deve ser maior ou igual a zero.")
    private BigDecimal baseCost;

    @NotNull(message = "O preço de venda é obrigatório.")
    @DecimalMin(value = "0.01", message = "O preço de venda deve ser maior que zero.")
    private BigDecimal sellingPrice;
}
