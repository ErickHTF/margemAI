package com.example.margemAI.service.assistant;

import com.example.margemAI.config.AssistantProperties;
import com.example.margemAI.exception.AssistantLimitExceededException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// Contagem em memória: reinicia com o servidor, o que basta para conter custos de um projeto acadêmico
@Component
public class AssistantUsageLimiter {

    private record DailyCount(LocalDate day, int count) {
    }

    private final AssistantProperties properties;
    private final Clock clock;
    private final Map<UUID, DailyCount> counts = new ConcurrentHashMap<>();

    public AssistantUsageLimiter(AssistantProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public int consume(UUID userId) {
        LocalDate today = LocalDate.now(clock);
        DailyCount updated = counts.compute(userId, (id, current) -> {
            int used = current != null && current.day().equals(today) ? current.count() : 0;
            if (used >= properties.dailyMessageLimit()) {
                throw new AssistantLimitExceededException("Você atingiu o limite de "
                        + properties.dailyMessageLimit() + " perguntas ao assistente por dia. Tente novamente amanhã.");
            }
            return new DailyCount(today, used + 1);
        });
        return properties.dailyMessageLimit() - updated.count();
    }

    public int remaining(UUID userId) {
        DailyCount current = counts.get(userId);
        int used = current != null && current.day().equals(LocalDate.now(clock)) ? current.count() : 0;
        return Math.max(0, properties.dailyMessageLimit() - used);
    }
}
