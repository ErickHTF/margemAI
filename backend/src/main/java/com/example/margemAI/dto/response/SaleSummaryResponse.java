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
public class SaleSummaryResponse {
    private BigDecimal totalGrossRevenue;
    private BigDecimal totalFeeAmount;
    private BigDecimal totalNetRevenue;
    private Long totalSalesCount;
    private PaginatedResponse<SaleResponse> sales;
}
