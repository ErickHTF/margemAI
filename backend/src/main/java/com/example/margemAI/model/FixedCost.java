package com.example.margemAI.model;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "fixed_costs")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FixedCost {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private FixedCostCategory category;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean recurring = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "fixed_cost_competencies", joinColumns = @JoinColumn(name = "fixed_cost_id"))
    @MapKeyColumn(name = "competency", length = 7)
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private Map<String, BigDecimal> competencyAmounts = new HashMap<>();

    @Column(name = "preserved_through", length = 7)
    private String preservedThrough;

    public BigDecimal amountForMonth(YearMonth month) {
        if (preservedThrough != null && !month.isAfter(YearMonth.parse(preservedThrough))) {
            return competencyAmounts.getOrDefault(month.toString(), BigDecimal.ZERO);
        }
        YearMonth first = createdAt != null ? YearMonth.from(createdAt) : month;
        if (Boolean.FALSE.equals(recurring)) {
            YearMonth reference = dueDate != null ? YearMonth.from(dueDate) : first;
            if (!month.equals(reference)) {
                return BigDecimal.ZERO;
            }
        } else if (month.isBefore(first)) {
            return BigDecimal.ZERO;
        }
        if (Boolean.FALSE.equals(active) && (updatedAt == null || month.isAfter(YearMonth.from(updatedAt)))) {
            return BigDecimal.ZERO;
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    public void preserveCompetencies(YearMonth through) {
        YearMonth first = createdAt != null ? YearMonth.from(createdAt) : through;
        if (dueDate != null && YearMonth.from(dueDate).isBefore(first)) {
            first = YearMonth.from(dueDate);
        }
        if (preservedThrough != null) {
            first = YearMonth.parse(preservedThrough).plusMonths(1);
        }
        for (YearMonth month = first; !month.isAfter(through); month = month.plusMonths(1)) {
            BigDecimal historicalAmount = amountForMonth(month);
            competencyAmounts.put(month.toString(), historicalAmount);
        }
        preservedThrough = through.toString();
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.recurring == null) {
            this.recurring = true;
        }
        if (this.active == null) {
            this.active = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
