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
public class SegmentGuidanceResponse {
    private String ruleVersion;
    private String segmentCode;
    private String segmentName;
    private boolean fallbackUsed;
    private String sebraeGuidanceSummary;
    private List<SegmentCostSuggestionResponse> costSuggestions;
}
