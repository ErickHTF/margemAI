package com.example.margemAI.service;

import com.example.margemAI.dto.response.MeiCapResponse;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    public static final BigDecimal STANDARD_ANNUAL_CAP = new BigDecimal("81000.00");
    public static final BigDecimal MONTHLY_MEI_CAP = new BigDecimal("6750.00");
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final UserRepository userRepository;
    private final com.example.margemAI.repository.SaleRepository saleRepository;

    @Transactional(readOnly = true)
    public MeiCapResponse getMeiCapStatus(UUID userId, BigDecimal customRevenue) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        LocalDateTime createdAt = user.getCreatedAt() != null ? user.getCreatedAt() : LocalDateTime.now();
        int currentYear = LocalDate.now().getYear();
        boolean proRata = createdAt.getYear() == currentYear;

        int activeMonths = 12;
        BigDecimal annualLimit;

        if (proRata) {
            int openingMonth = createdAt.getMonthValue();
            activeMonths = 12 - openingMonth + 1;
            annualLimit = MONTHLY_MEI_CAP.multiply(BigDecimal.valueOf(activeMonths)).setScale(2, RoundingMode.HALF_UP);
        } else {
            annualLimit = user.getCustomAnnualCap() != null ? user.getCustomAnnualCap() : STANDARD_ANNUAL_CAP;
        }

        BigDecimal accumulatedRevenue;
        boolean simulationMode = customRevenue != null;

        if (simulationMode) {
            accumulatedRevenue = customRevenue;
        } else {
            // Conforme LC 123/2006, o teto do MEI considera a Receita Bruta acumulada no ano-calendário
            LocalDateTime startOfYear = LocalDateTime.of(currentYear, 1, 1, 0, 0, 0);
            LocalDateTime endOfYear = LocalDateTime.of(currentYear, 12, 31, 23, 59, 59);
            accumulatedRevenue = saleRepository.sumGrossAmountByUserIdAndPeriod(userId, startOfYear, endOfYear);
            if (accumulatedRevenue == null) {
                accumulatedRevenue = BigDecimal.ZERO;
            }
        }

        if (accumulatedRevenue.compareTo(BigDecimal.ZERO) < 0) {
            accumulatedRevenue = BigDecimal.ZERO;
        }

        BigDecimal usagePercent = annualLimit.compareTo(BigDecimal.ZERO) > 0
                ? accumulatedRevenue.multiply(ONE_HUNDRED).divide(annualLimit, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal remainingAmount = annualLimit.subtract(accumulatedRevenue);
        if (remainingAmount.compareTo(BigDecimal.ZERO) < 0) {
            remainingAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }

        String severity;
        String recommendationMessage;

        if (usagePercent.compareTo(BigDecimal.valueOf(100)) >= 0) {
            severity = "CRITICAL";
            recommendationMessage = "Alerta Crítico: Limite anual do MEI ultrapassado! Procure seu contador imediatamente para planejamento de transição para Microempresa (ME) e regularização do DASN.";
        } else if (usagePercent.compareTo(BigDecimal.valueOf(85)) >= 0) {
            severity = "WARNING";
            recommendationMessage = "Alerta Preventivo: Você atingiu " + usagePercent + "% do limite anual do MEI (restam apenas R$ " + remainingAmount + "). Redobre a atenção para não estourar o teto.";
        } else if (usagePercent.compareTo(BigDecimal.valueOf(70)) >= 0) {
            severity = "INFO";
            recommendationMessage = "Aviso Informativo: Seu faturamento atingiu " + usagePercent + "% do teto anual do MEI. Mantenha o acompanhamento constante das suas vendas.";
        } else {
            severity = "NORMAL";
            recommendationMessage = "Faturamento dentro da faixa segura do MEI (" + usagePercent + "% consumido). Limite restante: R$ " + remainingAmount + ".";
        }

        return MeiCapResponse.builder()
                .annualLimit(annualLimit)
                .proRata(proRata)
                .activeMonths(activeMonths)
                .monthlyCap(MONTHLY_MEI_CAP)
                .accumulatedRevenue(accumulatedRevenue.setScale(2, RoundingMode.HALF_UP))
                .usagePercent(usagePercent)
                .remainingAmount(remainingAmount.setScale(2, RoundingMode.HALF_UP))
                .severity(severity)
                .recommendationMessage(recommendationMessage)
                .simulationMode(simulationMode)
                .build();
    }
}
