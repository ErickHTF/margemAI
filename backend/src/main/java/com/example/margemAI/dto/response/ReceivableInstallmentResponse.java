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
public class ReceivableInstallmentResponse {

    private UUID id;
    private UUID receivableId;
    private Integer installmentNumber;
    private Integer totalInstallments;
    private LocalDate dueDate;
    private BigDecimal grossAmount;
    private BigDecimal feeAmount;
    private BigDecimal netAmount;
    private BigDecimal receivedAmount;
    private BigDecimal remainingAmount;
    private InstallmentStatus status;
    private Boolean overdue;
    private LocalDateTime receivedAt;
    private String reversalReason;
    private LocalDateTime reversedAt;
    private String notes;
}
