package com.example.margemAI.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fixed_cost_profiles")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FixedCostProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    @Column(name = "total_fixed_costs_snapshot", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalFixedCostsSnapshot = BigDecimal.ZERO;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "revenue_baseline_mode", nullable = false, length = 30)
    private RevenueBaselineMode revenueBaselineMode = RevenueBaselineMode.TARGET_REVENUE;

    @Column(name = "monthly_revenue_target", precision = 12, scale = 2)
    private BigDecimal monthlyRevenueTarget;

    @Column(name = "historical_average_revenue", precision = 12, scale = 2)
    private BigDecimal historicalAverageRevenue;

    @Builder.Default
    @Column(name = "automatic_rateio", nullable = false)
    private Boolean automaticRateio = true;

    @Column(name = "manual_allocated_fixed_cost_percent", precision = 5, scale = 2)
    private BigDecimal manualAllocatedFixedCostPercent;

    @Builder.Default
    @Column(name = "allocated_fixed_cost_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal allocatedFixedCostPercent = BigDecimal.ZERO;

    @Column(name = "last_recalculated_at")
    private LocalDateTime lastRecalculatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.totalFixedCostsSnapshot == null) {
            this.totalFixedCostsSnapshot = BigDecimal.ZERO;
        }
        if (this.allocatedFixedCostPercent == null) {
            this.allocatedFixedCostPercent = BigDecimal.ZERO;
        }
        if (this.automaticRateio == null) {
            this.automaticRateio = true;
        }
        if (this.revenueBaselineMode == null) {
            this.revenueBaselineMode = RevenueBaselineMode.TARGET_REVENUE;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
