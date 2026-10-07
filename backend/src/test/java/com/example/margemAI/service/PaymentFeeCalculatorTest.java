package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentFeeCalculatorTest {

    @Mock
    private PaymentMethodConfigService configService;

    private PaymentFeeCalculator calculator;
    private PaymentFeeCalculator calculatorWithoutService;

    @BeforeEach
    void setUp() {
        calculator = new PaymentFeeCalculator(configService);
        calculatorWithoutService = new PaymentFeeCalculator();
    }

    @Test
    @DisplayName("Deve calcular venda em Dinheiro com taxa zero")
    void shouldCalculateCashSaleWithZeroFee() {
        BigDecimal quantity = new BigDecimal("2.00");
        BigDecimal unitPrice = new BigDecimal("50.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.DINHEIRO, 1, null);

        assertEquals(new BigDecimal("100.00"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.feePercentage());
        assertEquals(new BigDecimal("0.00"), result.feeAmount());
        assertEquals(new BigDecimal("100.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular venda em Pix com taxa zero")
    void shouldCalculatePixSaleWithZeroFee() {
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("250.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.PIX, 1, null);

        assertEquals(new BigDecimal("250.00"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.feePercentage());
        assertEquals(new BigDecimal("0.00"), result.feeAmount());
        assertEquals(new BigDecimal("250.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular venda em Débito com taxa padrão de 1.50%")
    void shouldCalculateDebitSaleWithDefaultFee() {
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("200.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.DEBITO, 1, null);

        assertEquals(new BigDecimal("200.00"), result.grossAmount());
        assertEquals(new BigDecimal("1.50"), result.feePercentage());
        assertEquals(new BigDecimal("3.00"), result.feeAmount());
        assertEquals(new BigDecimal("197.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular venda em Crédito à Vista com taxa padrão de 3.20%")
    void shouldCalculateCreditSightSaleWithDefaultFee() {
        BigDecimal quantity = new BigDecimal("3.00");
        BigDecimal unitPrice = new BigDecimal("100.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_A_VISTA, 1, null);

        assertEquals(new BigDecimal("300.00"), result.grossAmount());
        assertEquals(new BigDecimal("3.20"), result.feePercentage());
        assertEquals(new BigDecimal("9.60"), result.feeAmount());
        assertEquals(new BigDecimal("290.40"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular Crédito Parcelado em 3x com acréscimo proporcional (6.50%)")
    void shouldCalculateInstallmentCreditWithStepFee() {
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("1000.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_PARCELADO, 3, null);

        assertEquals(new BigDecimal("1000.00"), result.grossAmount());
        assertEquals(new BigDecimal("6.50"), result.feePercentage());
        assertEquals(new BigDecimal("65.00"), result.feeAmount());
        assertEquals(new BigDecimal("935.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular com taxa e tarifa fixa personalizada do usuário (tarifa mista)")
    void shouldCalculateWithUserCustomMixedFee() {
        UUID userId = UUID.randomUUID();
        PaymentMethodConfig customConfig = PaymentMethodConfig.builder()
                .paymentMethod(PaymentMethod.CREDITO_PARCELADO)
                .installments(2)
                .mdrFeePercent(new BigDecimal("4.99"))
                .fixedFeeAmount(new BigDecimal("0.50"))
                .settlementDays(30)
                .isActive(true)
                .build();

        when(configService.resolveConfig(userId, PaymentMethod.CREDITO_PARCELADO, 2))
                .thenReturn(Optional.of(customConfig));

        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("100.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                userId, quantity, unitPrice, PaymentMethod.CREDITO_PARCELADO, 2, null);

        // 100.00 * 4.99% = 4.99 + 0.50 fixo = 5.49
        assertEquals(new BigDecimal("100.00"), result.grossAmount());
        assertEquals(new BigDecimal("4.99"), result.feePercentage());
        assertEquals(new BigDecimal("5.49"), result.feeAmount());
        assertEquals(new BigDecimal("94.51"), result.netAmount());
    }

    @Test
    @DisplayName("Deve priorizar taxa informada manualmente sobre configuração salva do usuário")
    void shouldPrioritizeCustomFeePercentageOverSavedConfig() {
        UUID userId = UUID.randomUUID();
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("500.00");
        BigDecimal customFee = new BigDecimal("2.50");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                userId, quantity, unitPrice, PaymentMethod.CREDITO_A_VISTA, 1, customFee);

        assertEquals(new BigDecimal("500.00"), result.grossAmount());
        assertEquals(new BigDecimal("2.50"), result.feePercentage());
        assertEquals(new BigDecimal("12.50"), result.feeAmount());
        assertEquals(new BigDecimal("487.50"), result.netAmount());
    }

    @Test
    @DisplayName("Deve funcionar normalmente com construtor sem serviço externo (fallback limpo)")
    void shouldFallbackCleanlyWithoutService() {
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("200.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculatorWithoutService.calculate(
                UUID.randomUUID(), quantity, unitPrice, PaymentMethod.DEBITO, 1, null);

        assertEquals(new BigDecimal("200.00"), result.grossAmount());
        assertEquals(new BigDecimal("1.50"), result.feePercentage());
        assertEquals(new BigDecimal("3.00"), result.feeAmount());
        assertEquals(new BigDecimal("197.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve lançar exceção se quantidade for nula ou menor/igual a zero")
    void shouldThrowExceptionForInvalidQuantity() {
        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(BigDecimal.ZERO, new BigDecimal("10.00"), PaymentMethod.PIX, 1, null));
    }

    @Test
    @DisplayName("Deve lançar exceção se preço unitário for nulo ou menor/igual a zero")
    void shouldThrowExceptionForInvalidUnitPrice() {
        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(new BigDecimal("1.00"), BigDecimal.ZERO, PaymentMethod.PIX, 1, null));
    }
}
