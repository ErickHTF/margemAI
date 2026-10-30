package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantReplyResponse {

    private String reply;
    private List<String> toolsUsed;
    private List<AssistantCard> cards;
    private String model;
    private long inputTokens;
    private long outputTokens;
    private int remainingToday;
}
