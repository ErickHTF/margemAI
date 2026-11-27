package com.example.margemAI.model;

import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "receivables")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Receivable {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @Column(nullable = false, length = 200)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "gross_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "fee_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal feeAmount;

    @Column(name = "net_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal netAmount;

    @Builder.Default
    @Column(name = "received_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal receivedAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(nullable = false)
    private Integer installments = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReceivableStatus status;

    @Column(name = "issued_at", nullable = false)
    private LocalDate issuedAt;

    @Column(length = 500)
    private String notes;

    @Builder.Default
    @OneToMany(mappedBy = "receivable", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("installmentNumber ASC")
    private List<ReceivableInstallment> installmentList = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (issuedAt == null) {
            issuedAt = LocalDate.now();
        }
        if (receivedAmount == null) {
            receivedAmount = BigDecimal.ZERO;
        }
        if (installments == null || installments < 1) {
            installments = 1;
        }
        if (status == null) {
            status = ReceivableStatus.PENDING;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public ReceivableStatus getEffectiveStatus() {
        if (installmentList == null || installmentList.isEmpty()) {
            return status != null ? status : ReceivableStatus.PENDING;
        }
        boolean allReceived = installmentList.stream()
                .allMatch(i -> i.getStatus() == InstallmentStatus.RECEIVED);
        if (allReceived) {
            return ReceivableStatus.RECEIVED;
        }
        boolean hasOverdue = installmentList.stream().anyMatch(ReceivableInstallment::isOverdue);
        if (hasOverdue) {
            return ReceivableStatus.OVERDUE;
        }
        boolean hasPartial = installmentList.stream()
                .anyMatch(i -> (i.getReceivedAmount() != null && i.getReceivedAmount().compareTo(BigDecimal.ZERO) > 0)
                        || i.getStatus() == InstallmentStatus.PARTIAL);
        if (hasPartial) {
            return ReceivableStatus.PARTIALLY_RECEIVED;
        }
        return ReceivableStatus.PENDING;
    }

    public void recalculateTotals() {
        if (installmentList == null || installmentList.isEmpty()) {
            this.receivedAmount = BigDecimal.ZERO;
            this.status = ReceivableStatus.PENDING;
            return;
        }
        this.receivedAmount = installmentList.stream()
                .map(ReceivableInstallment::getReceivedAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        this.status = getEffectiveStatus();
    }
}
