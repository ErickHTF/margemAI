package com.example.margemAI.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(ActuatorHealthFailureTest.FailingDependencyConfig.class)
class ActuatorHealthFailureTest {

    @Autowired
    private MockMvc mockMvc;

    @TestConfiguration
    static class FailingDependencyConfig {
        @Bean("failingHealthIndicator")
        public HealthIndicator failingHealthIndicator() {
            return () -> Health.down()
                    .withDetail("error", "Database connection timeout")
                    .build();
        }
    }

    @Test
    @DisplayName("Deve retornar status 503 SERVICE_UNAVAILABLE e status DOWN quando uma dependência falhar")
    void shouldReturnHealthDownWhenDependencyFails() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.components.failing.status").value("DOWN"))
                .andExpect(jsonPath("$.components.failing.details.error").value("Database connection timeout"));
    }
}
