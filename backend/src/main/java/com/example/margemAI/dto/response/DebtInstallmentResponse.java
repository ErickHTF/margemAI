package com.example.margemAI.dto.response;

import com.example.margemAI.model.InstallmentStatus;
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
public class DebtInstallmentResponse {

    private UUID id;
    private UUID debtId;
    private String creditor;
    private Integer installmentNumber;
    private Integer totalInstallments;
    private LocalDate dueDate;
    private BigDecimal amount;
    private BigDecimal paidAmount;
    private LocalDate paidAt;
    private InstallmentStatus status;
    private String notes;
    private Boolean overdue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
