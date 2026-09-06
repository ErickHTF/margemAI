package com.example.margemAI.dto.response;

import com.example.margemAI.model.VariableCostCategory;
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
public class VariableCostResponse {
    private UUID id;
    private String name;
    private BigDecimal unitAmount;
    private VariableCostCategory category;
    private UUID productId;
    private String productName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
