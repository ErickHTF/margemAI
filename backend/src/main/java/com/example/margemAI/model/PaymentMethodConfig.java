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
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "payment_method_configs",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_user_payment_method_installments",
                        columnNames = {"user_id", "payment_method", "installments"}
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentMethodConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 50)
    private PaymentMethod paymentMethod;

    @Builder.Default
    @Column(name = "installments", nullable = false)
    private Integer installments = 1;

    @Builder.Default
    @Column(name = "mdr_fee_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal mdrFeePercent = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "fixed_fee_amount", precision = 10, scale = 2, nullable = false)
    private BigDecimal fixedFeeAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "settlement_days", nullable = false)
    private Integer settlementDays = 0;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.installments == null || this.installments < 1) {
            this.installments = 1;
        }
        if (this.mdrFeePercent == null) {
            this.mdrFeePercent = BigDecimal.ZERO;
        }
        if (this.fixedFeeAmount == null) {
            this.fixedFeeAmount = BigDecimal.ZERO;
        }
        if (this.settlementDays == null || this.settlementDays < 0) {
            this.settlementDays = 0;
        }
        if (this.isActive == null) {
            this.isActive = true;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
