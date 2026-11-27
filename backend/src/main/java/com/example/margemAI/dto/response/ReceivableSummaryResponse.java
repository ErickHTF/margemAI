package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceivableSummaryResponse {

    private BigDecimal totalSoldGross;
    private BigDecimal totalSoldNet;
    private BigDecimal totalReceivedEffectively;
    private BigDecimal totalPending;
    private BigDecimal totalOverdue;
    private Long totalCount;
    private PaginatedResponse<ReceivableResponse> receivables;
}
