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
public class SegmentCostSuggestionResponse {
    private String code;
    private String name;
    private String costType;
    private String category;
    private BigDecimal suggestedAmount;
    private BigDecimal suggestedPercent;
    private String whyItMatters;
    private boolean mandatory;
}
