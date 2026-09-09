package com.example.margemAI.dto.response;

import com.example.margemAI.model.FixedCostCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FixedCostResponse {
    private UUID id;
    private String name;
    private BigDecimal amount;
    private FixedCostCategory category;
    private LocalDate dueDate;
    private Boolean recurring;
    private Boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
