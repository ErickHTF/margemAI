package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("[TECH-01] Suíte de Precisão Financeira - Taxas de Cartão Débito e Crédito 1x a 12x")
class CardPaymentPrecisionTest {

    private PaymentFeeCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new PaymentFeeCalculator();
    }

    @Test
    @DisplayName("Deve garantir rigorosamente a conservação da identidade monetária: Bruto = Líquido + Taxa")
    void shouldStrictlyPreserveMonetaryIdentity() {
        BigDecimal quantity = new BigDecimal("7.00");
        BigDecimal unitPrice = new BigDecimal("33.33"); // Bruto = 233.31
        BigDecimal customFee = new BigDecimal("3.45"); // 3.45% de taxa

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_A_VISTA, 1, customFee);

        assertEquals(new BigDecimal("233.31"), result.grossAmount());
        assertEquals(result.grossAmount(), result.netAmount().add(result.feeAmount()),
                "O valor bruto deve ser estritamente igual à soma do valor líquido com a taxa retida.");
    }

    @ParameterizedTest(name = "Parcela {0}x deve aplicar MDR padrão correspondente na progressão escalonada")
    @ValueSource(ints = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12})
    @DisplayName("Deve cobrir exaustivamente parcelamento de cartão de 1x a 12x com acréscimo proporcional de 1.00% por parcela")
    void shouldCalculateInstallmentCreditFrom1To12(int installments) {
        // Regra do modelo:
        // Se 1x: 4.50%
        // Se N > 1: 4.50% + (N - 1) * 1.00%
        BigDecimal expectedFeePercent = installments == 1
                ? new BigDecimal("4.50")
                : new BigDecimal("4.50").add(BigDecimal.valueOf(installments - 1L).multiply(new BigDecimal("1.00")))
                .setScale(2, RoundingMode.HALF_UP);

        BigDecimal quantity = new BigDecimal("1.00");
        BigDecimal unitPrice = new BigDecimal("1200.00");

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                quantity, unitPrice, PaymentMethod.CREDITO_PARCELADO, installments, null);

        assertNotNull(result);
        assertEquals(new BigDecimal("1200.00"), result.grossAmount());
        assertEquals(expectedFeePercent, result.feePercentage());

        BigDecimal expectedFeeAmount = new BigDecimal("1200.00")
                .multiply(expectedFeePercent)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal expectedNetAmount = new BigDecimal("1200.00").subtract(expectedFeeAmount);

        assertEquals(expectedFeeAmount, result.feeAmount());
        assertEquals(expectedNetAmount, result.netAmount());
        assertEquals(result.grossAmount(), result.netAmount().add(result.feeAmount()));
    }

    @ParameterizedTest(name = "Débito com alíquota {0}% sobre R$ {1} -> Taxa R$ {2}, Líquido R$ {3}")
    @CsvSource({
            "1.50, 100.00, 1.50, 98.50",
            "1.25, 250.00, 3.13, 246.87",
            "1.99, 49.90, 0.99, 48.91",
            "0.90, 1500.00, 13.50, 1486.50"
    })
    @DisplayName("Deve calcular cartão de débito com alíquotas reais de adquirentes")
    void shouldCalculateDebitCardWithRealAcquirerRates(
            String rate, String price, String expectedFee, String expectedNet) {

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                BigDecimal.ONE, new BigDecimal(price), PaymentMethod.DEBITO, 1, new BigDecimal(rate));

        assertEquals(new BigDecimal(rate), result.feePercentage());
        assertEquals(new BigDecimal(expectedFee), result.feeAmount());
        assertEquals(new BigDecimal(expectedNet), result.netAmount());
        assertEquals(result.grossAmount(), result.netAmount().add(result.feeAmount()));
    }

    @ParameterizedTest(name = "Crédito à vista 1x com taxa {0}% sobre R$ {1} -> Taxa R$ {2}, Líquido R$ {3}")
    @CsvSource({
            "3.20, 100.00, 3.20, 96.80",
            "2.99, 399.90, 11.96, 387.94",
            "4.50, 89.90, 4.05, 85.85",
            "3.15, 1250.00, 39.38, 1210.62"
    })
    @DisplayName("Deve calcular crédito à vista 1x com diferentes alíquotas de mercado")
    void shouldCalculateCreditSightWithRealAcquirerRates(
            String rate, String price, String expectedFee, String expectedNet) {

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                BigDecimal.ONE, new BigDecimal(price), PaymentMethod.CREDITO_A_VISTA, 1, new BigDecimal(rate));

        assertEquals(new BigDecimal(rate), result.feePercentage());
        assertEquals(new BigDecimal(expectedFee), result.feeAmount());
        assertEquals(new BigDecimal(expectedNet), result.netAmount());
        assertEquals(result.grossAmount(), result.netAmount().add(result.feeAmount()));
    }

    @Test
    @DisplayName("Deve calcular transação de valor mínimo (R$ 0,01) sem divisão por zero ou truncamento incorreto")
    void shouldHandleMinimalCentavoTransaction() {
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                BigDecimal.ONE, new BigDecimal("0.01"), PaymentMethod.DEBITO, 1, new BigDecimal("1.50"));

        assertEquals(new BigDecimal("0.01"), result.grossAmount());
        assertEquals(new BigDecimal("0.00"), result.feeAmount()); // 0.01 * 1.5% = 0.00015 -> 0.00
        assertEquals(new BigDecimal("0.01"), result.netAmount());
        assertEquals(result.grossAmount(), result.netAmount().add(result.feeAmount()));
    }

    @Test
    @DisplayName("Deve calcular grandes transações (R$ 500.000,00) com exatidão centesimal")
    void shouldHandleLargeEnterpriseTransaction() {
        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                new BigDecimal("500.00"), new BigDecimal("1000.00"), PaymentMethod.CREDITO_PARCELADO, 12, null);

        // 12x: 4.50% + 11 * 1.00% = 15.50%
        // Bruto: R$ 500.000,00
        // Taxa: 500.000 * 15.50% = R$ 77.500,00
        // Líquido: R$ 422.500,00
        assertEquals(new BigDecimal("500000.00"), result.grossAmount());
        assertEquals(new BigDecimal("15.50"), result.feePercentage());
        assertEquals(new BigDecimal("77500.00"), result.feeAmount());
        assertEquals(new BigDecimal("422500.00"), result.netAmount());
    }

    @Test
    @DisplayName("Deve aplicar taxa zero em Dinheiro e Pix mesmo com parâmetros anômalos de parcelas")
    void shouldGuaranteeZeroFeeForCashAndPix() {
        PaymentFeeCalculator.FeeCalculationResult cashResult = calculator.calculate(
                new BigDecimal("3.00"), new BigDecimal("45.00"), PaymentMethod.DINHEIRO, 6, null);

        assertEquals(new BigDecimal("135.00"), cashResult.grossAmount());
        assertEquals(new BigDecimal("0.00"), cashResult.feePercentage());
        assertEquals(new BigDecimal("0.00"), cashResult.feeAmount());
        assertEquals(new BigDecimal("135.00"), cashResult.netAmount());

        PaymentFeeCalculator.FeeCalculationResult pixResult = calculator.calculate(
                new BigDecimal("2.00"), new BigDecimal("80.00"), PaymentMethod.PIX, 12, null);

        assertEquals(new BigDecimal("160.00"), pixResult.grossAmount());
        assertEquals(new BigDecimal("0.00"), pixResult.feePercentage());
        assertEquals(new BigDecimal("0.00"), pixResult.feeAmount());
        assertEquals(new BigDecimal("160.00"), pixResult.netAmount());
    }

    @Test
    @DisplayName("Deve lançar exceções claras para parâmetros inválidos ou fora de domínio")
    void shouldThrowExceptionsForInvalidArguments() {
        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(BigDecimal.ZERO, new BigDecimal("10.00"), PaymentMethod.DEBITO, 1, null));

        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(new BigDecimal("-1.00"), new BigDecimal("10.00"), PaymentMethod.DEBITO, 1, null));

        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(BigDecimal.ONE, BigDecimal.ZERO, PaymentMethod.DEBITO, 1, null));

        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(BigDecimal.ONE, new BigDecimal("-5.00"), PaymentMethod.DEBITO, 1, null));

        assertThrows(IllegalArgumentException.class, () ->
                calculator.calculate(BigDecimal.ONE, new BigDecimal("10.00"), null, 1, null));
    }
}
