package com.example.margemAI.service.assistant;

import com.example.margemAI.dto.response.BusinessProjectionResponse;
import com.example.margemAI.dto.response.FixedCostsSummaryResponse;
import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.dto.response.MonthlyFlowEntry;
import com.example.margemAI.dto.response.MonthlyFlowResponse;
import com.example.margemAI.service.AlertService;
import com.example.margemAI.service.DashboardService;
import com.example.margemAI.service.FixedCostProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessProjectionServiceTest {

    @Mock
    private DashboardService dashboardService;

    @Mock
    private FixedCostProfileService fixedCostProfileService;

    @Mock
    private AlertService alertService;

    private BusinessProjectionService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new BusinessProjectionService(dashboardService, fixedCostProfileService, alertService,
                Clock.fixed(Instant.parse("2026-10-21T12:00:00Z"), ZoneOffset.UTC));
        userId = UUID.randomUUID();
    }

    private static MonthlyFlowEntry month(String month, String revenue, String variable, String fees) {
        return MonthlyFlowEntry.builder()
                .month(month)
                .revenue(new BigDecimal(revenue))
                .variableCosts(new BigDecimal(variable))
                .paymentFees(new BigDecimal(fees))
                .fixedCosts(BigDecimal.ZERO)
                .totalExpenses(new BigDecimal(variable).add(new BigDecimal(fees)))
                .balance(new BigDecimal(revenue).subtract(new BigDecimal(variable)).subtract(new BigDecimal(fees)))
                .build();
    }

    private void history(MonthlyFlowEntry... months) {
        when(dashboardService.getMonthlyFlow(userId, BusinessProjectionService.HISTORY_MONTHS, "2026-09"))
                .thenReturn(MonthlyFlowResponse.builder().months(List.of(months)).build());
    }

    private void fixedCosts(String total) {
        when(fixedCostProfileService.getSummary(userId))
                .thenReturn(FixedCostsSummaryResponse.builder().totalFixedCosts(new BigDecimal(total)).build());
    }

    private void meiCap(String accumulated, String limit) {
        when(alertService.getMeiCapStatus(userId, null)).thenReturn(MeiCapResponse.builder()
                .accumulatedRevenue(new BigDecimal(accumulated))
                .annualLimit(new BigDecimal(limit))
                .build());
    }

    @Test
    @DisplayName("Deve projetar a partir da média dos últimos 3 meses sem tendência quando o faturamento é estável")
    void shouldProjectStableRevenueFromLastThreeMonths() {
        history(
                month("2026-04", "0", "0", "0"),
                month("2026-05", "3000", "600", "90"),
                month("2026-06", "3000", "600", "90"),
                month("2026-07", "3000", "600", "90"),
                month("2026-08", "3000", "600", "90"),
                month("2026-09", "3000", "600", "90"));
        fixedCosts("1250.00");
        meiCap("15000.00", "81000.00");

        BusinessProjectionResponse projection = service.project(userId, 3, null, null);

        assertEquals(List.of("2026-11", "2026-12", "2027-01"),
                projection.months().stream().map(BusinessProjectionResponse.Month::month).toList());
        BusinessProjectionResponse.Month first = projection.months().get(0);
        assertEquals(0, new BigDecimal("3000.00").compareTo(first.revenue()));
        assertEquals(0, new BigDecimal("1940.00").compareTo(first.expenses()));
        assertEquals(0, new BigDecimal("1060.00").compareTo(first.result()));
        assertEquals(0, new BigDecimal("3180.00").compareTo(projection.totalResult()));
        assertEquals(0, BigDecimal.ZERO.compareTo(projection.monthlyGrowthPercent()));
        assertEquals(0, new BigDecimal("21000.00").compareTo(projection.projectedYearRevenue()));
        assertNull(projection.capReachMonth());
    }

    @Test
    @DisplayName("Deve aplicar cenários de preço e de migração para o Pix mantendo a quantidade vendida")
    void shouldApplyPriceAndPixScenarios() {
        history(
                month("2026-07", "2000", "500", "80"),
                month("2026-08", "2000", "500", "80"),
                month("2026-09", "2000", "500", "80"));
        fixedCosts("900.00");
        meiCap("0.00", "81000.00");

        BusinessProjectionResponse projection = service.project(userId, 3, new BigDecimal("10"), new BigDecimal("50"));

        BusinessProjectionResponse.Month first = projection.months().get(0);
        assertEquals(0, new BigDecimal("2200.00").compareTo(first.revenue()));
        assertEquals(0, new BigDecimal("1444.00").compareTo(first.expenses()));
        assertEquals(0, new BigDecimal("756.00").compareTo(first.result()));
        assertEquals(0, new BigDecimal("520.00").compareTo(first.baselineResult()));
        assertTrue(projection.assumptions().stream().anyMatch(text -> text.contains("+10")));
    }

    @Test
    @DisplayName("Deve limitar a tendência a 5% ao mês e apontar o mês em que o teto do MEI seria atingido")
    void shouldClampGrowthAndFindCapMonth() {
        history(
                month("2026-07", "1000", "0", "0"),
                month("2026-08", "5000", "0", "0"),
                month("2026-09", "9000", "0", "0"));
        fixedCosts("0");
        meiCap("72000.00", "81000.00");

        BusinessProjectionResponse projection = service.project(userId, 6, null, null);

        assertEquals(0, new BigDecimal("5.00").compareTo(projection.monthlyGrowthPercent()));
        assertEquals("2026-12", projection.capReachMonth());
    }

    @Test
    @DisplayName("Deve recusar a projeção quando não há vendas em nenhum mês completo")
    void shouldRejectWithoutSales() {
        history(month("2026-08", "0", "0", "0"), month("2026-09", "0", "0", "0"));

        AssistantToolException error = assertThrows(AssistantToolException.class,
                () -> service.project(userId, 6, null, null));

        assertTrue(error.getMessage().contains("Registre as vendas"));
    }

    @ParameterizedTest(name = "meses={0} preço={1} pix={2}")
    @CsvSource({"2,0,0", "13,0,0", "6,-60,0", "6,0,120"})
    @DisplayName("Deve recusar horizonte ou cenário fora dos limites antes de consultar dados")
    void shouldRejectOutOfRangeParameters(int months, String price, String pix) {
        assertThrows(AssistantToolException.class,
                () -> service.project(userId, months, new BigDecimal(price), new BigDecimal(pix)));

        verifyNoInteractions(dashboardService, fixedCostProfileService, alertService);
    }
}
