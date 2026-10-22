package com.example.margemAI.dto.response;

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
public class DebtSummaryResponse {

    private BigDecimal totalOutstandingBalance;
    private BigDecimal totalMonthlyCommitment;
    private BigDecimal totalEstimatedInterest;
    private Integer activeDebtsCount;
    private Integer pendingInstallmentsCount;
    private String highestRateCreditor;
}
