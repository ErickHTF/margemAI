package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DebtPayoffSimulationResponse {

    private UUID debtId;
    private String creditor;
    private LocalDate simulationDate;
    private BigDecimal discountRateMonthly;
    private Integer installmentsCount;
    private List<Integer> simulatedInstallmentNumbers;
    private BigDecimal originalTotalAmount;
    private BigDecimal payoffAmount;
    private BigDecimal estimatedSavings;
    private BigDecimal savingsPercent;
    private List<String> assumptions;
}
