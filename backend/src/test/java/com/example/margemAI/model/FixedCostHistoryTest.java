package com.example.margemAI.model;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import static org.junit.jupiter.api.Assertions.assertEquals;

class FixedCostHistoryTest {
    @Test
    @DisplayName("Deve preservar competências anteriores e atuais após edição e exclusão")
    void shouldPreserveCompetenciesOnEditAndDelete() {
        FixedCost cost = FixedCost.builder().amount(new BigDecimal("100.00"))
                .createdAt(YearMonth.of(2026, 1).atDay(1).atStartOfDay()).build();
        cost.preserveCompetencies(YearMonth.of(2026, 3));
        cost.setAmount(new BigDecimal("200.00"));
        assertEquals(new BigDecimal("100.00"), cost.amountForMonth(YearMonth.of(2026, 2)));
        assertEquals(new BigDecimal("100.00"), cost.amountForMonth(YearMonth.of(2026, 3)));
        assertEquals(new BigDecimal("200.00"), cost.amountForMonth(YearMonth.of(2026, 4)));
        cost.preserveCompetencies(YearMonth.of(2026, 4));
        cost.setActive(false);
        cost.setUpdatedAt(YearMonth.of(2026, 4).atDay(1).atStartOfDay());
        assertEquals(new BigDecimal("100.00"), cost.amountForMonth(YearMonth.of(2026, 3)));
        assertEquals(new BigDecimal("200.00"), cost.amountForMonth(YearMonth.of(2026, 4)));
        assertEquals(BigDecimal.ZERO, cost.amountForMonth(YearMonth.of(2026, 5)));
    }

    @Test
    @DisplayName("Deve preservar vencimento e recorrência antigos sem duplicar custo pontual")
    void shouldPreserveOriginalDueDateAndRecurrence() {
        FixedCost cost = FixedCost.builder().amount(new BigDecimal("100.00"))
                .createdAt(YearMonth.of(2026, 1).atDay(1).atStartOfDay())
                .recurring(false).dueDate(LocalDate.of(2026, 2, 10)).build();
        cost.preserveCompetencies(YearMonth.of(2026, 3));
        cost.setDueDate(LocalDate.of(2026, 1, 10));
        cost.setRecurring(true);
        cost.setAmount(new BigDecimal("200.00"));
        assertEquals(BigDecimal.ZERO, cost.amountForMonth(YearMonth.of(2026, 1)));
        assertEquals(new BigDecimal("100.00"), cost.amountForMonth(YearMonth.of(2026, 2)));
        assertEquals(BigDecimal.ZERO, cost.amountForMonth(YearMonth.of(2026, 3)));
        assertEquals(new BigDecimal("200.00"), cost.amountForMonth(YearMonth.of(2026, 4)));
    }
}
