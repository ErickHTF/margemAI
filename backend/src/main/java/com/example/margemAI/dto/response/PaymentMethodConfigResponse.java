package com.example.margemAI.dto.response;

import com.example.margemAI.model.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMethodConfigResponse {

    private UUID id;
    private PaymentMethod paymentMethod;
    private String description;
    private Integer installments;
    private BigDecimal mdrFeePercent;
    private BigDecimal fixedFeeAmount;
    private Integer settlementDays;
    private Boolean isActive;
    private Boolean isCustomized;
    private BigDecimal defaultMdrFeePercent;
    private BigDecimal defaultFixedFeeAmount;
    private Integer defaultSettlementDays;
}
