package com.example.margemAI.service;

import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("[TECH-01] Suíte de Precisão Financeira - Validação de Teto Proporcional MEI (LC 123/2006)")
class MeiProportionalCapPrecisionTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SaleRepository saleRepository;

    @InjectMocks
    private AlertService alertService;

    private UUID userId;
    private int currentYear;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        currentYear = LocalDate.now().getYear();
    }

    @ParameterizedTest(name = "Empresa aberta no mês {0} deve ter {1} meses ativos e limite proporcional R$ {2}")
    @CsvSource({
            "1, 12, 81000.00",
            "2, 11, 74250.00",
            "3, 10, 67500.00",
            "4, 9, 60750.00",
            "5, 8, 54000.00",
            "6, 7, 47250.00",
            "7, 6, 40500.00",
            "8, 5, 33750.00",
            "9, 4, 27000.00",
            "10, 3, 20250.00",
            "11, 2, 13500.00",
            "12, 1, 6750.00"
    })
    @DisplayName("Deve calcular com exatidão o teto pro rata (R$ 6.750,00/mês) para todos os 12 meses de abertura")
    void shouldCalculateAccurateProRataForEveryOpeningMonth(
            int month, int expectedActiveMonths, String expectedLimit) {

        User user = User.builder()
                .id(userId)
                .name("MEI Pro Rata Teste")
                .email("pro_rata@teste.com")
                .createdAt(LocalDateTime.of(currentYear, month, 1, 10, 0))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        MeiCapResponse response = alertService.getMeiCapStatus(userId, BigDecimal.ZERO);

        assertNotNull(response);
        assertTrue(response.isProRata());
        assertEquals(expectedActiveMonths, response.getActiveMonths());
        assertEquals(new BigDecimal(expectedLimit), response.getAnnualLimit());
        assertEquals(new BigDecimal("6750.00"), response.getMonthlyCap());
    }

    @ParameterizedTest(name = "Faturamento R$ {0} ({1}% do teto R$ 81.000) -> Severidade esperada: {2}")
    @CsvSource({
            "56691.90, 69.99, NORMAL",
            "56700.00, 70.00, INFO",
            "60000.00, 74.07, INFO",
            "68841.90, 84.99, INFO",
            "68850.00, 85.00, WARNING",
            "75000.00, 92.59, WARNING",
            "80991.90, 99.99, WARNING",
            "81000.00, 100.00, CRITICAL",
            "85000.00, 104.94, CRITICAL",
            "97200.00, 120.00, CRITICAL",
            "97208.10, 120.01, CRITICAL"
    })
    @DisplayName("Deve validar as fronteiras exatas das faixas de severidade do teto MEI")
    void shouldValidateExactSeverityThresholdBoundaries(
            String revenueStr, String expectedUsagePercent, String expectedSeverity) {

        User establishedUser = User.builder()
                .id(userId)
                .name("MEI Estabelecido")
                .email("estabelecido@teste.com")
                .createdAt(LocalDateTime.of(currentYear - 2, 1, 1, 0, 0))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(establishedUser));

        BigDecimal revenue = new BigDecimal(revenueStr);
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertNotNull(response);
        assertFalse(response.isProRata());
        assertEquals(12, response.getActiveMonths());
        assertEquals(new BigDecimal("81000.00"), response.getAnnualLimit());
        assertEquals(new BigDecimal(expectedUsagePercent), response.getUsagePercent());
        assertEquals(expectedSeverity, response.getSeverity());
    }

    @Test
    @DisplayName("Deve garantir que remainingAmount não fique negativo quando faturamento ultrapassar 100%")
    void shouldEnsureRemainingAmountNeverGoesNegative() {
        User establishedUser = User.builder()
                .id(userId)
                .name("MEI Estabelecido")
                .email("estabelecido@teste.com")
                .createdAt(LocalDateTime.of(currentYear - 1, 5, 10, 0, 0))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(establishedUser));

        BigDecimal highRevenue = new BigDecimal("120000.00");
        MeiCapResponse response = alertService.getMeiCapStatus(userId, highRevenue);

        assertEquals(new BigDecimal("0.00"), response.getRemainingAmount());
        assertEquals(new BigDecimal("148.15"), response.getUsagePercent());
        assertEquals("CRITICAL", response.getSeverity());
        assertTrue(response.getRecommendationMessage().contains("transição para Microempresa (ME)"));
    }

    @Test
    @DisplayName("Deve respeitar teto anual personalizado quando configurado no perfil do MEI")
    void shouldRespectCustomAnnualCapWhenConfigured() {
        BigDecimal customCap = new BigDecimal("100000.00");
        User userWithCustomCap = User.builder()
                .id(userId)
                .name("MEI Projeto Piloto")
                .email("piloto@teste.com")
                .createdAt(LocalDateTime.of(currentYear - 1, 1, 1, 0, 0))
                .customAnnualCap(customCap)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(userWithCustomCap));

        BigDecimal revenue = new BigDecimal("85000.00");
        MeiCapResponse response = alertService.getMeiCapStatus(userId, revenue);

        assertEquals(customCap, response.getAnnualLimit());
        assertEquals(new BigDecimal("85.00"), response.getUsagePercent());
        assertEquals("WARNING", response.getSeverity());
        assertEquals(new BigDecimal("15000.00"), response.getRemainingAmount());
    }

    @Test
    @DisplayName("Deve tratar receita negativa normalizando-a para zero e mantendo integridade financeira")
    void shouldNormalizeNegativeRevenueToZero() {
        User establishedUser = User.builder()
                .id(userId)
                .name("MEI Estabelecido")
                .email("estabelecido@teste.com")
                .createdAt(LocalDateTime.of(currentYear - 1, 1, 1, 0, 0))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(establishedUser));

        MeiCapResponse response = alertService.getMeiCapStatus(userId, new BigDecimal("-500.00"));

        assertEquals(new BigDecimal("0.00"), response.getAccumulatedRevenue());
        assertEquals(new BigDecimal("0.00"), response.getUsagePercent());
        assertEquals(new BigDecimal("81000.00"), response.getRemainingAmount());
        assertEquals("NORMAL", response.getSeverity());
    }

    @Test
    @DisplayName("Deve somar faturamento real do ano fiscal a partir do repositório de vendas em modo de produção")
    void shouldSumCurrentYearSalesInProductionMode() {
        User establishedUser = User.builder()
                .id(userId)
                .name("MEI Ativo")
                .email("ativo@teste.com")
                .createdAt(LocalDateTime.of(currentYear - 1, 1, 1, 0, 0))
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(establishedUser));
        when(saleRepository.sumGrossAmountByUserIdAndPeriod(eq(userId), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(new BigDecimal("70000.00"));

        MeiCapResponse response = alertService.getMeiCapStatus(userId, null);

        assertNotNull(response);
        assertFalse(response.isSimulationMode());
        assertEquals(new BigDecimal("70000.00"), response.getAccumulatedRevenue());
        assertEquals(new BigDecimal("86.42"), response.getUsagePercent());
        assertEquals("WARNING", response.getSeverity());
        assertEquals(new BigDecimal("11000.00"), response.getRemainingAmount());
    }
}
