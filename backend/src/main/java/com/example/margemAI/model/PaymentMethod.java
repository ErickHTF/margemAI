package com.example.margemAI.model;

import lombok.Getter;

import java.math.BigDecimal;

@Getter
public enum PaymentMethod {
    DINHEIRO("Dinheiro", new BigDecimal("0.00")),
    PIX("Pix", new BigDecimal("0.00")),
    DEBITO("Cartão de Débito", new BigDecimal("1.50")),
    CREDITO_A_VISTA("Crédito à Vista", new BigDecimal("3.20")),
    CREDITO_PARCELADO("Crédito Parcelado", new BigDecimal("4.50"));

    private final String description;
    private final BigDecimal defaultFeePercentage;

    PaymentMethod(String description, BigDecimal defaultFeePercentage) {
        this.description = description;
        this.defaultFeePercentage = defaultFeePercentage;
    }
}
