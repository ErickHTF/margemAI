package com.example.margemAI.dto.response;

import com.example.margemAI.model.ItemType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private UUID id;
    private String name;
    private String description;
    private ItemType type;
    private BigDecimal baseCost;
    private BigDecimal variableCostsTotal;
    private BigDecimal effectiveBaseCost;
    private BigDecimal sellingPrice;
    private BigDecimal contributionMargin;
    private BigDecimal marginPercentage;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
