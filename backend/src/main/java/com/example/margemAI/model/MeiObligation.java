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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "mei_obligations",
        uniqueConstraints = @UniqueConstraint(
                columnNames = {"user_id", "obligation_type", "reference_year", "competency"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeiObligation {

    public static final int DEFAULT_REMINDER_DAYS_BEFORE = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "obligation_type", nullable = false, length = 30)
    private MeiObligationType obligationType;

    @Column(name = "reference_year", nullable = false)
    private Integer referenceYear;

    @Column(name = "competency", nullable = false, length = 10)
    private String competency;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private MeiObligationStatus status = MeiObligationStatus.PENDING;

    @Column(name = "manual_receipt_code", length = 120)
    private String manualReceiptCode;

    @Column(name = "paid_at")
    private LocalDate paidAt;

    @Builder.Default
    @Column(name = "reminder_days_before", nullable = false)
    private Integer reminderDaysBefore = DEFAULT_REMINDER_DAYS_BEFORE;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = MeiObligationStatus.PENDING;
        }
        if (this.reminderDaysBefore == null) {
            this.reminderDaysBefore = DEFAULT_REMINDER_DAYS_BEFORE;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
