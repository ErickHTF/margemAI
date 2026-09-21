package com.example.margemAI.service;

import java.math.BigDecimal;

public record CategoryParameters(
        BigDecimal targetProfitMargin,
        BigDecimal taxRate,
        BigDecimal maxDiscountAllowed
) {
}
