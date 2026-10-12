package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import com.example.margemAI.repository.PaymentMethodConfigRepository;
import com.example.margemAI.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Named;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Casos compartilhados de taxa de pagamento (shared/fixtures/payment-fees.json)")
class PaymentFeeSharedCasesTest {

    private static final Path FIXTURE = Path.of("..", "shared", "fixtures", "payment-fees.json");

    static Stream<Arguments> sharedCases() throws IOException {
        Path fixture = FIXTURE.toAbsolutePath().normalize();
        assertTrue(Files.isRegularFile(fixture),
                "Fixture compartilhada não encontrada em " + fixture
                        + ". Rode os testes a partir de backend/ com o repositório completo.");

        JsonNode cases = new ObjectMapper().readTree(fixture.toFile()).path("cases");
        assertTrue(cases.isArray() && !cases.isEmpty(), "A fixture não contém casos em \"cases\".");

        return StreamSupport.stream(cases.spliterator(), false)
                .map(node -> Arguments.of(Named.of(node.path("description").asText(), node)));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("sharedCases")
    void shouldMatchSharedCase(JsonNode sharedCase) {
        JsonNode input = sharedCase.path("input");
        JsonNode expected = sharedCase.path("expected");

        PaymentFeeCalculator calculator = new PaymentFeeCalculator(configServiceBackedBy(input.path("matrix")));

        PaymentFeeCalculator.FeeCalculationResult result = calculator.calculate(
                UUID.randomUUID(),
                decimal(input, "quantity"),
                decimal(input, "unitPrice"),
                PaymentMethod.valueOf(input.path("paymentMethod").asText()),
                input.path("installments").isNull() ? null : input.path("installments").asInt(),
                decimal(input, "customFeePercent")
        );

        assertAll(
                () -> assertDecimal(expected, "gross", result.grossAmount()),
                () -> assertDecimal(expected, "feePercent", result.feePercentage()),
                () -> assertDecimal(expected, "fixedFee", result.fixedFeeAmount()),
                () -> assertDecimal(expected, "feeAmount", result.feeAmount()),
                () -> assertDecimal(expected, "netAmount", result.netAmount())
        );
    }

    private static PaymentMethodConfigService configServiceBackedBy(JsonNode matrix) {
        List<PaymentMethodConfig> entries = new ArrayList<>();
        for (JsonNode entry : matrix) {
            entries.add(PaymentMethodConfig.builder()
                    .paymentMethod(PaymentMethod.valueOf(entry.path("paymentMethod").asText()))
                    .installments(entry.path("installments").asInt(1))
                    .mdrFeePercent(decimal(entry, "mdrFeePercent"))
                    .fixedFeeAmount(decimal(entry, "fixedFeeAmount"))
                    .isActive(entry.path("isActive").isBoolean() ? entry.path("isActive").asBoolean() : null)
                    .build());
        }

        PaymentMethodConfigRepository repository = mock(PaymentMethodConfigRepository.class);
        when(repository.findByUserIdAndPaymentMethodAndInstallments(any(), any(), anyInt()))
                .thenAnswer(invocation -> findEntry(entries, invocation.getArgument(1), invocation.getArgument(2)));

        return new PaymentMethodConfigService(repository, mock(UserRepository.class));
    }

    private static Optional<PaymentMethodConfig> findEntry(List<PaymentMethodConfig> entries, PaymentMethod method, int installments) {
        return entries.stream()
                .filter(e -> e.getPaymentMethod() == method && e.getInstallments() == installments)
                .findFirst();
    }

    private static BigDecimal decimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isNull() || value.isMissingNode() ? null : new BigDecimal(value.asText());
    }

    private static void assertDecimal(JsonNode expected, String field, BigDecimal actual) {
        BigDecimal expectedValue = decimal(expected, field);
        assertEquals(0, expectedValue.compareTo(actual),
                () -> field + ": esperado " + expectedValue + ", obtido " + actual);
    }
}
