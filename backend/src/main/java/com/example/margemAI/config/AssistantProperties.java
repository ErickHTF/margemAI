package com.example.margemAI.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "margemai.ai")
public record AssistantProperties(
        String apiKey,
        String model,
        long maxTokens,
        int maxToolRounds,
        int maxHistoryMessages,
        int dailyMessageLimit
) {

    public boolean configured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
