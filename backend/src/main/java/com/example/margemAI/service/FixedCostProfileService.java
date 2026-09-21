package com.example.margemAI.service;

import com.example.margemAI.dto.request.RateioConfigRequest;
import com.example.margemAI.dto.response.FixedCostsSummaryResponse;
import com.example.margemAI.event.FixedCostsRecalculatedEvent;
import com.example.margemAI.model.FixedCostProfile;
import com.example.margemAI.model.RevenueBaselineMode;
import com.example.margemAI.repository.FixedCostProfileRepository;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FixedCostProfileService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal SEVERE_RISK_THRESHOLD = BigDecimal.valueOf(80);

    private final FixedCostProfileRepository profileRepository;
    private final FixedCostRepository fixedCostRepository;
    private final UserRepository userRepository;

    @Transactional
    public FixedCostsSummaryResponse getSummary(UUID userId) {
        return toResponse(recalculate(userId));
    }

    @Transactional
    public FixedCostsSummaryResponse updateConfig(UUID userId, RateioConfigRequest request) {
        FixedCostProfile profile = getOrCreate(userId);

        if (request.getRevenueBaselineMode() != null) {
            profile.setRevenueBaselineMode(request.getRevenueBaselineMode());
        }
        if (request.getMonthlyRevenueTarget() != null) {
            profile.setMonthlyRevenueTarget(request.getMonthlyRevenueTarget());
        }
        if (request.getHistoricalAverageRevenue() != null) {
            profile.setHistoricalAverageRevenue(request.getHistoricalAverageRevenue());
        }
        if (request.getAutomaticRateio() != null) {
            profile.setAutomaticRateio(request.getAutomaticRateio());
        }
        if (request.getManualAllocatedFixedCostPercent() != null) {
            profile.setManualAllocatedFixedCostPercent(request.getManualAllocatedFixedCostPercent());
        }

        return toResponse(recalculate(userId));
    }

    @Transactional
    public BigDecimal getEffectiveFixedCostPercent(UUID userId) {
        return recalculate(userId).getAllocatedFixedCostPercent();
    }

    @Transactional
    public FixedCostProfile recalculate(UUID userId) {
        FixedCostProfile profile = getOrCreate(userId);

        BigDecimal snapshot = fixedCostRepository.sumActiveAmountByUserId(userId);
        if (snapshot == null) {
            snapshot = BigDecimal.ZERO;
        }
        profile.setTotalFixedCostsSnapshot(snapshot.setScale(2, RoundingMode.HALF_UP));

        BigDecimal percent;
        if (Boolean.TRUE.equals(profile.getAutomaticRateio())) {
            BigDecimal baseline = resolveBaseline(profile);
            percent = baseline.compareTo(BigDecimal.ZERO) > 0
                    ? snapshot.multiply(ONE_HUNDRED).divide(baseline, 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
        } else {
            percent = profile.getManualAllocatedFixedCostPercent() != null
                    ? profile.getManualAllocatedFixedCostPercent()
                    : BigDecimal.ZERO;
        }
        profile.setAllocatedFixedCostPercent(percent.setScale(2, RoundingMode.HALF_UP));
        profile.setLastRecalculatedAt(LocalDateTime.now());

        return profileRepository.save(profile);
    }

    @EventListener
    public void onFixedCostsRecalculated(FixedCostsRecalculatedEvent event) {
        recalculate(event.userId());
    }

    private FixedCostProfile getOrCreate(UUID userId) {
        return profileRepository.findByUserId(userId)
                .orElseGet(() -> profileRepository.save(FixedCostProfile.builder()
                        .user(userRepository.getReferenceById(userId))
                        .totalFixedCostsSnapshot(BigDecimal.ZERO)
                        .allocatedFixedCostPercent(BigDecimal.ZERO)
                        .revenueBaselineMode(RevenueBaselineMode.TARGET_REVENUE)
                        .automaticRateio(true)
                        .build()));
    }

    private BigDecimal resolveBaseline(FixedCostProfile profile) {
        if (profile.getRevenueBaselineMode() == RevenueBaselineMode.HISTORICAL_AVERAGE) {
            return profile.getHistoricalAverageRevenue() != null
                    ? profile.getHistoricalAverageRevenue()
                    : BigDecimal.ZERO;
        }
        return profile.getMonthlyRevenueTarget() != null
                ? profile.getMonthlyRevenueTarget()
                : BigDecimal.ZERO;
    }

    private FixedCostsSummaryResponse toResponse(FixedCostProfile profile) {
        BigDecimal percent = profile.getAllocatedFixedCostPercent();
        boolean severeRisk = percent.compareTo(SEVERE_RISK_THRESHOLD) > 0;

        String riskMessage = severeRisk
                ? "Risco severo: a carga de custos fixos representa " + percent + "% do faturamento projetado, acima do limite de 80%."
                : "Carga de custos fixos dentro do limite saudável (até 80% do faturamento).";

        return FixedCostsSummaryResponse.builder()
                .totalFixedCosts(profile.getTotalFixedCostsSnapshot())
                .revenueBaseline(resolveBaseline(profile))
                .revenueBaselineMode(profile.getRevenueBaselineMode())
                .allocatedFixedCostPercent(percent)
                .automaticRateio(profile.getAutomaticRateio())
                .severeRisk(severeRisk)
                .riskMessage(riskMessage)
                .lastRecalculatedAt(profile.getLastRecalculatedAt())
                .build();
    }
}
