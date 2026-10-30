package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantStatusResponse {

    private boolean enabled;
    private String model;
    private int dailyLimit;
    private int remainingToday;
}
