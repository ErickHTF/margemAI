package com.example.margemAI.service;

import com.example.margemAI.dto.request.RateioConfigRequest;
import com.example.margemAI.dto.response.FixedCostsSummaryResponse;
import com.example.margemAI.event.FixedCostsRecalculatedEvent;
import com.example.margemAI.model.FixedCostProfile;
import com.example.margemAI.model.RevenueBaselineMode;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FixedCostProfileRepository;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FixedCostProfileServiceTest {

    @Mock
    private FixedCostProfileRepository profileRepository;

    @Mock
    private FixedCostRepository fixedCostRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FixedCostProfileService service;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder().id(userId).name("MEI").email("mei@test.com").build();
    }

    private FixedCostProfile profile(RevenueBaselineMode mode, boolean automatic) {
        return FixedCostProfile.builder()
                .id(UUID.randomUUID())
                .user(user)
                .revenueBaselineMode(mode)
                .automaticRateio(automatic)
                .totalFixedCostsSnapshot(BigDecimal.ZERO)
                .allocatedFixedCostPercent(BigDecimal.ZERO)
                .build();
    }

    @Test
    void shouldComputeAutomaticPercentFromTargetRevenue() {
        FixedCostProfile profile = profile(RevenueBaselineMode.TARGET_REVENUE, true);
        profile.setMonthlyRevenueTarget(new BigDecimal("1000.00"));

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("200.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        FixedCostsSummaryResponse summary = service.getSummary(userId);

        assertEquals(new BigDecimal("200.00"), summary.getTotalFixedCosts());
        assertEquals(new BigDecimal("20.00"), summary.getAllocatedFixedCostPercent());
        assertEquals(new BigDecimal("1000.00"), summary.getRevenueBaseline());
        assertFalse(summary.getSevereRisk());
    }

    @Test
    void shouldComputeAutomaticPercentFromHistoricalAverage() {
        FixedCostProfile profile = profile(RevenueBaselineMode.HISTORICAL_AVERAGE, true);
        profile.setHistoricalAverageRevenue(new BigDecimal("2000.00"));

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("400.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        FixedCostsSummaryResponse summary = service.getSummary(userId);

        assertEquals(new BigDecimal("2000.00"), summary.getRevenueBaseline());
        assertEquals(new BigDecimal("20.00"), summary.getAllocatedFixedCostPercent());
    }

    @Test
    void shouldUseManualPercentWhenAutomaticIsDisabled() {
        FixedCostProfile profile = profile(RevenueBaselineMode.TARGET_REVENUE, false);
        profile.setManualAllocatedFixedCostPercent(new BigDecimal("12.50"));

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("999.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        FixedCostsSummaryResponse summary = service.getSummary(userId);

        assertEquals(new BigDecimal("12.50"), summary.getAllocatedFixedCostPercent());
    }

    @Test
    void shouldFlagSevereRiskAboveEightyPercent() {
        FixedCostProfile profile = profile(RevenueBaselineMode.TARGET_REVENUE, true);
        profile.setMonthlyRevenueTarget(new BigDecimal("1000.00"));

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("850.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        FixedCostsSummaryResponse summary = service.getSummary(userId);

        assertEquals(new BigDecimal("85.00"), summary.getAllocatedFixedCostPercent());
        assertTrue(summary.getSevereRisk());
    }

    @Test
    void shouldReturnZeroPercentWhenBaselineIsMissing() {
        FixedCostProfile profile = profile(RevenueBaselineMode.TARGET_REVENUE, true);

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("150.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        FixedCostsSummaryResponse summary = service.getSummary(userId);

        assertEquals(BigDecimal.ZERO.setScale(2), summary.getAllocatedFixedCostPercent());
    }

    @Test
    void shouldCreateProfileWhenNoneExists() {
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(BigDecimal.ZERO);

        BigDecimal percent = service.getEffectiveFixedCostPercent(userId);

        assertEquals(BigDecimal.ZERO.setScale(2), percent);
    }

    @Test
    void shouldApplyConfigAndRecalculate() {
        FixedCostProfile profile = profile(RevenueBaselineMode.TARGET_REVENUE, true);

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("300.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        FixedCostsSummaryResponse summary = service.updateConfig(userId, RateioConfigRequest.builder()
                .monthlyRevenueTarget(new BigDecimal("1500.00"))
                .revenueBaselineMode(RevenueBaselineMode.TARGET_REVENUE)
                .build());

        assertEquals(new BigDecimal("20.00"), summary.getAllocatedFixedCostPercent());
        assertEquals(new BigDecimal("1500.00"), summary.getRevenueBaseline());
    }

    @Test
    void shouldRecalculateWhenEventIsPublished() {
        FixedCostProfile profile = profile(RevenueBaselineMode.TARGET_REVENUE, true);
        profile.setMonthlyRevenueTarget(new BigDecimal("1000.00"));

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fixedCostRepository.sumActiveAmountByUserId(userId)).thenReturn(new BigDecimal("100.00"));
        when(profileRepository.save(any(FixedCostProfile.class))).thenAnswer(inv -> inv.getArgument(0));

        service.onFixedCostsRecalculated(new FixedCostsRecalculatedEvent(userId));

        verify(profileRepository).save(any(FixedCostProfile.class));
        assertEquals(new BigDecimal("10.00"), profile.getAllocatedFixedCostPercent());
    }
}
