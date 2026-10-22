package com.example.margemAI.dto.response;

import com.example.margemAI.model.MeiObligationStatus;
import com.example.margemAI.model.MeiObligationType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeiObligationResponse {

    private UUID id;
    private MeiObligationType obligationType;
    private String title;
    private Integer referenceYear;
    private String competency;
    private LocalDate dueDate;
    private MeiObligationStatus status;
    private String manualReceiptCode;
    private LocalDate paidAt;
    private Integer reminderDaysBefore;
    private String notes;
    private boolean dueSoon;
    private boolean overdue;
    private long daysUntilDue;
    private String officialUrl;
    private String officialPortalLabel;
    private String verificationSource;
    private boolean regularityGuaranteed;
    private String regularityDisclaimer;
    private LocalDateTime updatedAt;
}
