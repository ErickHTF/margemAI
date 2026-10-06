package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PaymentFeeCalculatorTest {

    private PaymentFeeCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new PaymentFeeCalculator();
    }

    @Test
    @DisplayName("Deve calcular venda em Dinheiro com taxa zero")
    void shouldCalculateCashSaleWithZeroFee() {
        // Arrange
        BigDecimal quantity = new BigDecimal("2.00");
        BigDecimal unitPrice = new BigDecimal("50.00");

        // Act
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.DINHEIRO, 1, null);

        // Assert
        assertEquals(new BigDecimal("100.00"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.feePercentage());
        assertEquals(new BigDecimal("0.00"), result.feeAmount());
        assertEquals(new BigDecimal("100.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular venda em Pix com taxa zero")
    void shouldCalculatePixSaleWithZeroFee() {
        // Arrange
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("250.00");

        // Act
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.PIX, 1, null);

        // Assert
        assertEquals(new BigDecimal("250.00"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.feePercentage());
        assertEquals(new BigDecimal("0.00"), result.feeAmount());
        assertEquals(new BigDecimal("250.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular venda em Débito com taxa padrão de 1.50%")
    void shouldCalculateDebitSaleWithDefaultFee() {
        // Arrange
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("200.00");

        // Act
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.DEBITO, 1, null);

        // Assert
        assertEquals(new BigDecimal("200.00"), result.grossAmount());
        assertEquals(new BigDecimal("1.50"), result.feePercentage());
        assertEquals(new BigDecimal("3.00"), result.feeAmount());
        assertEquals(new BigDecimal("197.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular venda em Crédito à Vista com taxa padrão de 3.20%")
    void shouldCalculateCreditSightSaleWithDefaultFee() {
        // Arrange
        BigDecimal quantity = new BigDecimal("3.00");
        BigDecimal unitPrice = new BigDecimal("100.00");

        // Act
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_A_VISTA, 1, null);

        // Assert
        assertEquals(new BigDecimal("300.00"), result.grossAmount());
        assertEquals(new BigDecimal("3.20"), result.feePercentage());
        assertEquals(new BigDecimal("9.60"), result.feeAmount());
        assertEquals(new BigDecimal("290.40"), result.netAmount());
    }

    @Test
    @DisplayName("Deve calcular Crédito Parcelado em 3x com acréscimo proporcional (6.50%)")
    void shouldCalculateInstallmentCreditWithStepFee() {
        // Arrange (base 4.50% + 2 * 1.00% = 6.50%)
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("1000.00");

        // Act
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_PARCELADO, 3, null);

        // Assert
        assertEquals(new BigDecimal("1000.00"), result.grossAmount());
        assertEquals(new BigDecimal("6.50"), result.feePercentage());
        assertEquals(new BigDecimal("65.00"), result.feeAmount());
        assertEquals(new BigDecimal("935.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve utilizar taxa customizada quando informada pelo usuário")
    void shouldUseCustomFeePercentageWhenProvided() {
        // Arrange
        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("500.00");
        BigDecimal customFee = new BigDecimal("2.50");

        // Act
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_A_VISTA, 1, customFee);

        // Assert
        assertEquals(new BigDecimal("500.00"), result.grossAmount());
        assertEquals(new BigDecimal("2.50"), result.feePercentage());
        assertEquals(new BigDecimal("12.50"), result.feeAmount());
        assertEquals(new BigDecimal("487.50"), result.netAmount());
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
