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

    public static final int MIN_INSTALLMENTS_PARCELADO = 2;

    public int normalizeInstallments(Integer installments) {
        int requested = installments == null || installments < 1 ? 1 : installments;
        return this == CREDITO_PARCELADO ? Math.max(MIN_INSTALLMENTS_PARCELADO, requested) : requested;
    }

    public int getDefaultSettlementDays() {
        return switch (this) {
            case DINHEIRO, PIX -> 0;
            case DEBITO -> 1;
            case CREDITO_A_VISTA, CREDITO_PARCELADO -> 30;
        };
    }
}
