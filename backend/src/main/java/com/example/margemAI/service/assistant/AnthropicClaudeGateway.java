package com.example.margemAI.service.assistant;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.example.margemAI.config.AssistantProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class AnthropicClaudeGateway implements ClaudeGateway {

    private final AnthropicClient client;

    public AnthropicClaudeGateway(AssistantProperties properties) {
        this.client = properties.configured()
                ? AnthropicOkHttpClient.builder()
                        .apiKey(properties.apiKey())
                        .timeout(Duration.ofSeconds(60))
                        .maxRetries(2)
                        .build()
                : null;
    }

    @Override
    public boolean isConfigured() {
        return client != null;
    }

    @Override
    public Message send(MessageCreateParams params) {
        return client.messages().create(params);
    }
}
