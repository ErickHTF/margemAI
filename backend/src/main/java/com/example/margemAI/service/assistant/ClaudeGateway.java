package com.example.margemAI.service.assistant;

import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;

public interface ClaudeGateway {

    boolean isConfigured();

    Message send(MessageCreateParams params);
}
