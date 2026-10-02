package com.example.margemAI.dto.response;

import com.example.margemAI.model.PaymentMethod;
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
public class SaleResponse {
    private UUID id;
    private UUID productId;
    private String productName;
    private String description;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal grossAmount;
    private PaymentMethod paymentMethod;
    private String paymentMethodDescription;
    private Integer installments;
    private BigDecimal feePercentage;
    private BigDecimal feeAmount;
    private BigDecimal netAmount;
    private LocalDateTime soldAt;
    private String notes;
    private LocalDateTime createdAt;

    public BigDecimal getUnitAmount() {
        return unitPrice;
    }

    public BigDecimal getTotalAmount() {
        return grossAmount;
    }

    public LocalDateTime getSaleDate() {
        return soldAt;
    }
}
