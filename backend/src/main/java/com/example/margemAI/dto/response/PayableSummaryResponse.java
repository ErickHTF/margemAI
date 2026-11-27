package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayableSummaryResponse {

    private BigDecimal totalCommittedExpense;
    private BigDecimal totalEffectiveDisbursement;
    private BigDecimal totalOpenPayable;
    private BigDecimal totalOverduePayable;
    private List<PayableAccountResponse> items;

    public List<PayableAccountResponse> getPayables() {
        return items;
    }
}
