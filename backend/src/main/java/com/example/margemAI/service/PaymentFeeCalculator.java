package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import com.example.margemAI.util.Money;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Component
public class PaymentFeeCalculator {

    private static final BigDecimal INSTALLMENT_STEP_FEE = new BigDecimal("1.00");

    private final PaymentMethodConfigService configService;

    @Autowired
    public PaymentFeeCalculator(PaymentMethodConfigService configService) {
        this.configService = configService;
    }

    // Construtor sem dependência para compatibilidade em testes unitários puros
    public PaymentFeeCalculator() {
        this.configService = null;
    }

    public record FeeCalculationResult(
            BigDecimal grossAmount,
            BigDecimal feePercentage,
            BigDecimal fixedFeeAmount,
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
        return calculate(null, quantity, unitPrice, paymentMethod, installments, customFeePercentage);
    }

    public FeeCalculationResult calculate(
            UUID userId,
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
        BigDecimal grossAmount = Money.round(quantity.multiply(unitPrice));

        BigDecimal effectiveFeePercentage;
        BigDecimal fixedFee = BigDecimal.ZERO;

        if (customFeePercentage != null) {
            effectiveFeePercentage = Money.round(customFeePercentage);
        } else if (userId != null && configService != null) {
            Optional<PaymentMethodConfig> configOpt = configService.resolveConfig(userId, paymentMethod, validInstallments);
            if (configOpt.isPresent() && Boolean.TRUE.equals(configOpt.get().getIsActive())) {
                PaymentMethodConfig config = configOpt.get();
                effectiveFeePercentage = Money.round(config.getMdrFeePercent());
                fixedFee = config.getFixedFeeAmount() != null
                        ? Money.round(config.getFixedFeeAmount())
                        : BigDecimal.ZERO;
            } else {
                effectiveFeePercentage = resolveDefaultFeePercentage(paymentMethod, validInstallments);
            }
        } else {
            effectiveFeePercentage = resolveDefaultFeePercentage(paymentMethod, validInstallments);
        }

        BigDecimal percentageFeeAmount = Money.percentOf(grossAmount, effectiveFeePercentage);

        BigDecimal totalFeeAmount = Money.round(percentageFeeAmount.add(fixedFee));

        BigDecimal netAmount = Money.round(grossAmount.subtract(totalFeeAmount));

        return new FeeCalculationResult(grossAmount, effectiveFeePercentage, Money.round(fixedFee), totalFeeAmount, netAmount);
    }

    private BigDecimal resolveDefaultFeePercentage(PaymentMethod paymentMethod, int installments) {
        if (paymentMethod == PaymentMethod.CREDITO_PARCELADO && installments > 1) {
            BigDecimal additionalFee = INSTALLMENT_STEP_FEE.multiply(BigDecimal.valueOf(installments - 1L));
            return Money.round(paymentMethod.getDefaultFeePercentage().add(additionalFee));
        }

        return Money.round(paymentMethod.getDefaultFeePercentage());
    }
}
