package com.example.margemAI.dto.response;

import com.example.margemAI.model.PayableStatus;
import com.example.margemAI.model.PayableType;
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
public class PayableAccountResponse {

    private UUID id;
    private UUID userId;
    private PayableType type;
    private UUID fixedCostId;
    private String competency;
    private String description;
    private String category;
    private LocalDate dueDate;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private PayableStatus status;
    private LocalDateTime paidAt;
    private String notes;
    private List<PayablePaymentResponse> payments;
    private Boolean overdue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
