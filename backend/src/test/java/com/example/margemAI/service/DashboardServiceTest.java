package com.example.margemAI.service;

import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.dto.response.MonthlyFlowResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.VariableCostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private FixedCostRepository fixedCostRepository;

    @Mock
    private VariableCostRepository variableCostRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private UUID userId;
    private Product product;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        product = Product.builder().id(UUID.randomUUID()).name("Açaí 500ml").build();
    }

    private Sale sale(String gross, String fee, String quantity, Product saleProduct, LocalDateTime soldAt) {
        return Sale.builder()
                .grossAmount(new BigDecimal(gross))
                .feeAmount(new BigDecimal(fee))
                .quantity(new BigDecimal(quantity))
                .product(saleProduct)
                .soldAt(soldAt)
                .build();
    }

    private VariableCost variableCost(String unitAmount) {
        return VariableCost.builder()
                .unitAmount(new BigDecimal(unitAmount))
                .category(VariableCostCategory.EMBALAGEM)
                .productId(product.getId())
                .active(true)
                .build();
    }

    private FixedCost fixedCost(String amount, boolean recurring, boolean active,
                                LocalDate dueDate, LocalDateTime createdAt, LocalDateTime updatedAt) {
        return FixedCost.builder()
                .name("Custo")
                .amount(new BigDecimal(amount))
                .category(FixedCostCategory.ALUGUEL)
                .recurring(recurring)
                .active(active)
                .dueDate(dueDate)
                .createdAt(createdAt)
                .updatedAt(updatedAt)
                .build();
    }

    private MonthlyFlowEntry month(MonthlyFlowResponse response, String month) {
        return response.getMonths().stream()
                .filter(entry -> entry.getMonth().equals(month))
                .findFirst()
                .orElseThrow();
    }

    @Test
    @DisplayName("Deve consolidar receitas, custos variáveis, taxas e custos fixos por mês")
    void shouldAggregateRevenueAndExpensesPerMonth() {
        when(saleRepository.findByUserIdAndSoldAtInPeriod(eq(userId), any(), any())).thenReturn(List.of(
                sale("100.00", "3.00", "2", product, LocalDateTime.of(2026, 3, 10, 14, 0)),
                sale("200.00", "0.00", "1", null, LocalDateTime.of(2026, 6, 30, 23, 59))
        ));
        when(variableCostRepository.findByUserIdAndActiveTrueAndProductIdIsNotNull(userId))
                .thenReturn(List.of(variableCost("5.00"), variableCost("2.50")));
        LocalDateTime createdInMay = LocalDateTime.of(2026, 5, 10, 9, 0);
        when(fixedCostRepository.findByUserId(userId))
                .thenReturn(List.of(fixedCost("1000.00", true, true, null, createdInMay, createdInMay)));

        MonthlyFlowResponse response = dashboardService.getMonthlyFlow(userId, 6, "2026-06");

        assertEquals("2026-01", response.getStartMonth());
        assertEquals("2026-06", response.getEndMonth());
        assertEquals(6, response.getMonths().size());
        assertEquals("2026-01", response.getMonths().get(0).getMonth());

        MonthlyFlowEntry march = month(response, "2026-03");
        assertEquals(new BigDecimal("100.00"), march.getRevenue());
        assertEquals(1, march.getSalesCount());
        assertEquals(new BigDecimal("15.00"), march.getVariableCosts());
        assertEquals(new BigDecimal("3.00"), march.getPaymentFees());
        assertEquals(new BigDecimal("0.00"), march.getFixedCosts());
        assertEquals(new BigDecimal("18.00"), march.getTotalExpenses());
        assertEquals(new BigDecimal("82.00"), march.getBalance());

        assertEquals(new BigDecimal("0.00"), month(response, "2026-04").getFixedCosts());
        assertEquals(new BigDecimal("-1000.00"), month(response, "2026-05").getBalance());

        MonthlyFlowEntry june = month(response, "2026-06");
        assertEquals(new BigDecimal("200.00"), june.getRevenue());
        assertEquals(new BigDecimal("1000.00"), june.getFixedCosts());
        assertEquals(new BigDecimal("-800.00"), june.getBalance());

        assertEquals(new BigDecimal("300.00"), response.getTotalRevenue());
        assertEquals(new BigDecimal("2018.00"), response.getTotalExpenses());
        assertEquals(new BigDecimal("-1718.00"), response.getBalance());
        assertEquals(new BigDecimal("50.00"), response.getAverageRevenue());
        assertEquals(new BigDecimal("336.33"), response.getAverageExpenses());
        assertEquals("2026-03", response.getBestMonth());
        assertEquals("2026-05", response.getWorstMonth());
    }

    @Test
    @DisplayName("Deve lançar custo pontual no mês de vencimento e encerrar custo desativado no mês da desativação")
    void shouldApplyOneOffAndDeactivatedFixedCosts() {
        LocalDateTime created = LocalDateTime.of(2025, 11, 5, 8, 0);
        when(fixedCostRepository.findByUserId(userId)).thenReturn(List.of(
                fixedCost("300.00", false, true, LocalDate.of(2026, 2, 15), created, created),
                fixedCost("100.00", true, false, null, created, LocalDateTime.of(2026, 3, 20, 10, 0))
        ));

        MonthlyFlowResponse response = dashboardService.getMonthlyFlow(userId, 6, "2026-06");

        assertEquals(new BigDecimal("100.00"), month(response, "2026-01").getFixedCosts());
        assertEquals(new BigDecimal("400.00"), month(response, "2026-02").getFixedCosts());
        assertEquals(new BigDecimal("100.00"), month(response, "2026-03").getFixedCosts());
        assertEquals(new BigDecimal("0.00"), month(response, "2026-04").getFixedCosts());
        assertEquals(new BigDecimal("600.00"), response.getTotalExpenses());
    }

    @Test
    @DisplayName("Deve usar 6 meses terminando no mês atual quando parâmetros não forem informados")
    void shouldDefaultToSixMonthsEndingInCurrentMonth() {
        MonthlyFlowResponse response = dashboardService.getMonthlyFlow(userId, null, null);

        assertEquals(6, response.getMonths().size());
        assertEquals(YearMonth.now().toString(), response.getEndMonth());
        assertEquals(new BigDecimal("0.00"), response.getTotalRevenue());
        assertNull(response.getBestMonth());
        assertNull(response.getWorstMonth());
    }

    @Test
    @DisplayName("Deve aceitar período de 12 meses")
    void shouldAcceptTwelveMonthPeriod() {
        MonthlyFlowResponse response = dashboardService.getMonthlyFlow(userId, 12, "2026-06");

        assertEquals(12, response.getMonths().size());
        assertEquals("2025-07", response.getStartMonth());
    }

    @Test
    @DisplayName("Deve rejeitar período fora da faixa de 6 a 12 meses")
    void shouldRejectPeriodOutOfRange() {
        assertThrows(InvalidRequestException.class, () -> dashboardService.getMonthlyFlow(userId, 5, "2026-06"));
        assertThrows(InvalidRequestException.class, () -> dashboardService.getMonthlyFlow(userId, 13, "2026-06"));
    }

    @Test
    @DisplayName("Deve rejeitar mês final em formato inválido")
    void shouldRejectInvalidEndMonth() {
        assertThrows(InvalidRequestException.class, () -> dashboardService.getMonthlyFlow(userId, 6, "2026-13"));
        assertThrows(InvalidRequestException.class, () -> dashboardService.getMonthlyFlow(userId, 6, "junho"));
    }
}
