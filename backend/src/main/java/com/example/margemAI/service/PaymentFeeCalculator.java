package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class PaymentFeeCalculator {

    private static final BigDecimal HUNDRED = new BigDecimal("100.00");
    private static final BigDecimal INSTALLMENT_STEP_FEE = new BigDecimal("1.00");

    public record FeeCalculationResult(
            BigDecimal grossAmount,
            BigDecimal feePercentage,
            BigDecimal feeAmount,
            BigDecimal netAmount
    ) {}

    public FeeCalculationResult calculate(
            BigDecimal quantity,
            BigDecimal unitPrice,
            PaymentMethod paymentMethod,
            Integer installments,
            BigDecimal customFeePercentage
    ) {
        if (quantity == null || quantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("A quantidade deve ser maior que zero.");
        }
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O preço unitário deve ser maior que zero.");
        }
        if (paymentMethod == null) {
            throw new IllegalArgumentException("O método de pagamento não pode ser nulo.");
        }

        int validInstallments = (installments == null || installments < 1) ? 1 : installments;

        BigDecimal grossAmount = quantity.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);

        BigDecimal effectiveFeePercentage = resolveFeePercentage(paymentMethod, validInstallments, customFeePercentage);

        BigDecimal feeAmount = grossAmount
                .multiply(effectiveFeePercentage)
                .divide(HUNDRED, 2, RoundingMode.HALF_UP);

        BigDecimal netAmount = grossAmount.subtract(feeAmount).setScale(2, RoundingMode.HALF_UP);

        return new FeeCalculationResult(grossAmount, effectiveFeePercentage, feeAmount, netAmount);
    }

    private BigDecimal resolveFeePercentage(
            PaymentMethod paymentMethod,
            int installments,
            BigDecimal customFeePercentage
    ) {
        if (customFeePercentage != null) {
            return customFeePercentage.setScale(2, RoundingMode.HALF_UP);
        }

        if (paymentMethod == PaymentMethod.CREDITO_PARCELADO && installments > 1) {
            BigDecimal additionalFee = INSTALLMENT_STEP_FEE.multiply(BigDecimal.valueOf(installments - 1L));
            return paymentMethod.getDefaultFeePercentage().add(additionalFee).setScale(2, RoundingMode.HALF_UP);
        }

        return paymentMethod.getDefaultFeePercentage().setScale(2, RoundingMode.HALF_UP);
    }
}
