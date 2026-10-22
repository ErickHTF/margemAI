package com.example.margemAI.dto.response;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.ReceivableStatus;
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
public class ReceivableResponse {

    private UUID id;
    private UUID saleId;
    private String description;
    private PaymentMethod paymentMethod;
    private String paymentMethodDescription;
    private BigDecimal grossAmount;
    private BigDecimal feeAmount;
    private BigDecimal netAmount;
    private BigDecimal receivedAmount;
    private BigDecimal remainingAmount;
    private Integer installmentsCount;
    private ReceivableStatus status;
    private LocalDate issuedAt;
    private String notes;
    private List<ReceivableInstallmentResponse> installments;
    private LocalDateTime createdAt;
}
