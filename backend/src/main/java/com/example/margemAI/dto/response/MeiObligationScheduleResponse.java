package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeiObligationScheduleResponse {

    private Integer year;
    private Integer reminderDaysBefore;
    private String verificationSource;
    private boolean regularityGuaranteed;
    private String regularityDisclaimer;
    private int totalCount;
    private int paidDeclaredCount;
    private int pendingCount;
    private int overdueCount;
    private int dueSoonCount;
    private List<MeiOfficialLinkResponse> officialLinks;
    private List<MeiObligationResponse> obligations;
}
