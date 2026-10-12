package com.example.margemAI.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MoneyTest {

    @ParameterizedTest(name = "{0} arredonda para {1}")
    @CsvSource({
            "1.005, 1.01",
            "1.004, 1.00",
            "2.345, 2.35",
            "10, 10.00",
            "-1.005, -1.01",
            "-1.004, -1.00",
            "0, 0.00"
    })
    @DisplayName("Deve arredondar para 2 casas com HALF_UP, inclusive valores negativos")
    void shouldRoundToTwoDecimalsHalfUp(String value, String expected) {
        BigDecimal result = Money.round(new BigDecimal(value));

        assertEquals(new BigDecimal(expected), result);
        assertEquals(2, result.scale());
    }

    @Test
    @DisplayName("Deve rejeitar valor nulo ao arredondar")
    void shouldRejectNullWhenRounding() {
        assertThrows(NullPointerException.class, () -> Money.round(null));
    }

    @Test
    @DisplayName("ZERO deve ter escala 2")
    void zeroShouldHaveScaleTwo() {
        assertEquals(new BigDecimal("0.00"), Money.ZERO);
    }

    @ParameterizedTest(name = "{1}% de {0} = {2}")
    @CsvSource({
            "100.00, 1.50, 1.50",
            "0.50, 1.00, 0.01",
            "2.50, 1.50, 0.04",
            "0.70, 1.50, 0.01",
            "3420.30, 15.00, 513.05",
            "100.00, 0, 0.00",
            "-200.00, 2.5, -5.00",
            "-0.50, 1.00, -0.01"
    })
    @DisplayName("Deve calcular percentual de um valor com arredondamento único em 2 casas HALF_UP")
    void shouldCalculatePercentOfAmount(String amount, String percent, String expected) {
        BigDecimal result = Money.percentOf(new BigDecimal(amount), new BigDecimal(percent));

        assertEquals(new BigDecimal(expected), result);
    }

    @ParameterizedTest(name = "{0} de {1} = {2}%")
    @CsvSource({
            "25, 100, 25.00",
            "1, 3, 33.33",
            "2, 3, 66.67",
            "1, 8, 12.50",
            "1, 800, 0.13",
            "-10, 40, -25.00"
    })
    @DisplayName("Deve calcular quanto uma parte representa do todo em percentual")
    void shouldCalculatePercentageOfWhole(String part, String whole, String expected) {
        BigDecimal result = Money.percentageOf(new BigDecimal(part), new BigDecimal(whole));

        assertEquals(new BigDecimal(expected), result);
    }

    @Test
    @DisplayName("Deve falhar ao calcular percentual sobre um todo igual a zero")
    void shouldFailWhenWholeIsZero() {
        assertThrows(ArithmeticException.class, () -> Money.percentageOf(BigDecimal.ONE, BigDecimal.ZERO));
    }
}
