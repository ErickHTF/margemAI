package com.example.margemAI.service;

import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.example.margemAI.repository.SaleRepository saleRepository;

    @InjectMocks
    private AlertService alertService;

    private UUID userId;
    private User oldUser;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        // User opened in a previous year (no pro rata)
        oldUser = User.builder()
                .id(userId)
                .name("MEI Estabelecido")
                .email("mei@teste.com")
                .createdAt(LocalDateTime.of(2023, 1, 15, 10, 0))
                .customAnnualCap(new BigDecimal("81000.00"))
                .build();
    }

    @Test
    @DisplayName("Deve retornar severidade NORMAL quando faturamento estiver abaixo de 70%")
    void shouldCalculateNormalSeverityUnder70Percent() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(oldUser));

        BigDecimal revenue = new BigDecimal("40000.00");
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertNotNull(response);
        assertEquals("NORMAL", response.getSeverity());
        assertFalse(response.isProRata());
        assertEquals(12, response.getActiveMonths());
        assertEquals(new BigDecimal("81000.00"), response.getAnnualLimit());
        assertEquals(new BigDecimal("49.38"), response.getUsagePercent());
        assertEquals(new BigDecimal("41000.00"), response.getRemainingAmount());
        assertTrue(response.getRecommendationMessage().contains("faixa segura"));
    }

    @Test
    @DisplayName("Deve retornar severidade INFO quando faturamento atingir entre 70% e 84.99%")
    void shouldCalculateInfoSeverityAt70Percent() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(oldUser));

        BigDecimal revenue = new BigDecimal("60000.00"); // 74.07%
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertNotNull(response);
        assertEquals("INFO", response.getSeverity());
        assertEquals(new BigDecimal("74.07"), response.getUsagePercent());
        assertTrue(response.getRecommendationMessage().contains("Aviso Informativo"));
    }

    @Test
    @DisplayName("Deve retornar severidade WARNING quando faturamento atingir entre 85% e 99.99%")
    void shouldCalculateWarningSeverityAt85Percent() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(oldUser));

        BigDecimal revenue = new BigDecimal("70000.00"); // 86.42%
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertNotNull(response);
        assertEquals("WARNING", response.getSeverity());
        assertEquals(new BigDecimal("86.42"), response.getUsagePercent());
        assertTrue(response.getRecommendationMessage().contains("Alerta Preventivo"));
    }

    @Test
    @DisplayName("Deve retornar severidade CRITICAL quando faturamento for igual ou superior a 100%")
    void shouldCalculateCriticalSeverityAt100PercentOrAbove() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(oldUser));

        BigDecimal revenue = new BigDecimal("82000.00"); // 101.23%
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertNotNull(response);
        assertEquals("CRITICAL", response.getSeverity());
        assertEquals(new BigDecimal("101.23"), response.getUsagePercent());
        assertEquals(new BigDecimal("0.00"), response.getRemainingAmount());
        assertTrue(response.getRecommendationMessage().contains("Alerta Crítico"));
    }

    @Test
    @DisplayName("Deve calcular limite pro rata para empresa aberta no meio do ano fiscal")
    void shouldCalculateProRataLimitForCompanyOpenedMidYear() {
        int currentYear = LocalDate.now().getYear();
        // Empresa aberta em julho do ano corrente (6 meses ativos: jul, ago, set, out, nov, dez)
        User midYearUser = User.builder()
                .id(userId)
                .name("MEI Recente")
                .email("recente@teste.com")
                .createdAt(LocalDateTime.of(currentYear, 7, 1, 9, 0))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(midYearUser));

        // 6 meses * R$ 6.750,00 = R$ 40.500,00
        BigDecimal revenue = new BigDecimal("35000.00"); // ~86.42% do limite pro rata de 40.500
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertNotNull(response);
        assertTrue(response.isProRata());
        assertEquals(6, response.getActiveMonths());
        assertEquals(new BigDecimal("40500.00"), response.getAnnualLimit());
        assertEquals(new BigDecimal("86.42"), response.getUsagePercent());
        assertEquals("WARNING", response.getSeverity());
        assertTrue(response.isSimulationMode());
    }

    @Test
    @DisplayName("Deve somar faturamento bruto real a partir de vendas persistidas quando customRevenue for nulo")
    void shouldCalculateProductionRevenueFromSaleRepositoryWhenNoCustomRevenueGiven() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(oldUser));
        when(saleRepository.sumGrossAmountByUserIdAndPeriod(
                org.mockito.ArgumentMatchers.eq(userId),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(new BigDecimal("60000.00"));

        MeiCapResponse response = alertService.getMeiCapStatus(userId, null);

        assertNotNull(response);
        assertFalse(response.isSimulationMode());
        assertEquals(new BigDecimal("60000.00"), response.getAccumulatedRevenue());
        assertEquals(new BigDecimal("74.07"), response.getUsagePercent());
        assertEquals("INFO", response.getSeverity());
    }

    @Test
    @DisplayName("Deve retornar faturamento zero em modo de produção quando usuário não possuir vendas")
    void shouldReturnZeroRevenueWhenUserHasNoSalesInPeriod() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(oldUser));
        when(saleRepository.sumGrossAmountByUserIdAndPeriod(
                org.mockito.ArgumentMatchers.eq(userId),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class),
                org.mockito.ArgumentMatchers.any(LocalDateTime.class)
        )).thenReturn(null);

        MeiCapResponse response = alertService.getMeiCapStatus(userId, null);

        assertNotNull(response);
        assertFalse(response.isSimulationMode());
        assertEquals(new BigDecimal("0.00"), response.getAccumulatedRevenue());
        assertEquals(new BigDecimal("0.00"), response.getUsagePercent());
        assertEquals("NORMAL", response.getSeverity());
        assertEquals(new BigDecimal("81000.00"), response.getRemainingAmount());
    }
}
