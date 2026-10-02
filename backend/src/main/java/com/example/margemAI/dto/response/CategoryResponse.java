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
public class CategoryResponse {
    private UUID id;
    private String name;
    private String slug;
    private ItemType type;
    private BigDecimal targetProfitMargin;
    private BigDecimal taxRate;
    private BigDecimal maxDiscountAllowed;
    private BigDecimal variableCostPercent;
    private Boolean active;
    private UUID parentId;
    private String parentName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
