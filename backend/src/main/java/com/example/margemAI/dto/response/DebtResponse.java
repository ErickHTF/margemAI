package com.example.margemAI.dto.response;

import com.example.margemAI.model.DebtStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtResponse {

    private UUID id;
    private String creditor;
    private String description;
    private BigDecimal principalAmount;
    private BigDecimal monthlyInterestRate;
    private BigDecimal fixedFeesAmount;
    private Integer totalInstallments;
    private BigDecimal installmentAmount;
    private LocalDate firstDueDate;
    private DebtStatus status;

    // Métricas financeiras calculadas
    private BigDecimal totalContractedCost;
    private BigDecimal totalInterestAndFees;
    private BigDecimal effectiveCostMultiple;
    private BigDecimal effectiveCostPercent;
    private BigDecimal remainingBalance;
    private BigDecimal paidAmountTotal;
    private Integer remainingInstallments;
    private Integer paidInstallments;
    private Integer priorityRank;

    private List<DebtInstallmentResponse> installments;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
