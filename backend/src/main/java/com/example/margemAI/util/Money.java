package com.example.margemAI.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Money {

    public static final int SCALE = 2;
    public static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    public static final BigDecimal ZERO = BigDecimal.ZERO.setScale(SCALE, ROUNDING);

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private Money() {
    }

    public static BigDecimal round(BigDecimal value) {
        return value.setScale(SCALE, ROUNDING);
    }

    public static BigDecimal percentOf(BigDecimal amount, BigDecimal percent) {
        return amount.multiply(percent).divide(ONE_HUNDRED, SCALE, ROUNDING);
    }

    public static BigDecimal percentageOf(BigDecimal part, BigDecimal whole) {
        return part.multiply(ONE_HUNDRED).divide(whole, SCALE, ROUNDING);
    }
}
