package com.example.margemAI.service.assistant;

import com.example.margemAI.config.AssistantProperties;
import com.example.margemAI.exception.AssistantLimitExceededException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AssistantUsageLimiterTest {

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final AssistantProperties properties = new AssistantProperties("k", "claude-haiku-5-5", 8000, 8, 20, 2);

    @Test
    @DisplayName("Deve bloquear o usuário ao passar do limite diário e liberar no dia seguinte")
    void shouldBlockAfterDailyLimitAndResetNextDay() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-21T10:00:00Z"));
        AssistantUsageLimiter limiter = new AssistantUsageLimiter(properties, clock);
        UUID userId = UUID.randomUUID();

        assertEquals(1, limiter.consume(userId));
        assertEquals(0, limiter.consume(userId));
        assertThrows(AssistantLimitExceededException.class, () -> limiter.consume(userId));

        clock.now = Instant.parse("2026-10-22T08:00:00Z");
        assertEquals(2, limiter.remaining(userId));
        assertEquals(1, limiter.consume(userId));
    }

    @Test
    @DisplayName("Deve contar o limite separadamente para cada usuário")
    void shouldCountLimitPerUser() {
        AssistantUsageLimiter limiter = new AssistantUsageLimiter(properties,
                new MutableClock(Instant.parse("2026-10-21T10:00:00Z")));
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();

        limiter.consume(first);
        limiter.consume(first);

        assertEquals(0, limiter.remaining(first));
        assertEquals(2, limiter.remaining(second));
    }
}
