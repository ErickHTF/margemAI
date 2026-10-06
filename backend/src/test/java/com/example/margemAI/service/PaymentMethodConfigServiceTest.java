package com.example.margemAI.service;

import com.example.margemAI.dto.request.PaymentMethodConfigRequest;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.PaymentMethodConfigRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentMethodConfigServiceTest {

    @Mock
    private PaymentMethodConfigRepository configRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PaymentMethodConfigService configService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder().id(userId).email("mei@teste.com").build();
    }

    @Test
    @DisplayName("Deve retornar matriz padrão completa (15 opções) quando o usuário não tiver taxas customizadas salvas")
    void shouldReturnDefaultMatrixWhenNoCustomConfigExists() {
        when(configRepository.findByUserIdOrderByPaymentMethodAscInstallmentsAsc(userId))
                .thenReturn(Collections.emptyList());

        List<PaymentMethodConfigResponse> matrix = configService.getMatrixForUser(userId);

        assertNotNull(matrix);
        // Dinheiro (1) + Pix (1) + Débito (1) + Crédito à vista (1) + Parcelado (11) = 15 opções
        assertEquals(15, matrix.size());

        // Verificar Pix default
        PaymentMethodConfigResponse pix = matrix.stream()
                .filter(m -> m.getPaymentMethod() == PaymentMethod.PIX)
                .findFirst()
                .orElseThrow();
        assertEquals(new BigDecimal("0.00"), pix.getMdrFeePercent());
        assertFalse(pix.getIsCustomized());

        // Verificar Débito default (1.50%)
        PaymentMethodConfigResponse debito = matrix.stream()
                .filter(m -> m.getPaymentMethod() == PaymentMethod.DEBITO)
                .findFirst()
                .orElseThrow();
        assertEquals(new BigDecimal("1.50"), debito.getMdrFeePercent());
        assertFalse(debito.getIsCustomized());

        // Verificar Crédito Parcelado 2x (4.50 + 1 = 5.50%)
        PaymentMethodConfigResponse credito2x = matrix.stream()
                .filter(m -> m.getPaymentMethod() == PaymentMethod.CREDITO_PARCELADO && m.getInstallments() == 2)
                .findFirst()
                .orElseThrow();
        assertEquals(new BigDecimal("5.50"), credito2x.getMdrFeePercent());
        assertFalse(credito2x.getIsCustomized());
    }

    @Test
    @DisplayName("Deve mesclar e sinalizar configurações customizadas salvas pelo usuário")
    void shouldMergeCustomConfigurationsWhenSaved() {
        PaymentMethodConfig customDebito = PaymentMethodConfig.builder()
                .id(UUID.randomUUID())
                .user(user)
                .paymentMethod(PaymentMethod.DEBITO)
                .installments(1)
                .mdrFeePercent(new BigDecimal("1.25"))
                .fixedFeeAmount(new BigDecimal("0.20"))
                .settlementDays(1)
                .isActive(true)
                .build();

        when(configRepository.findByUserIdOrderByPaymentMethodAscInstallmentsAsc(userId))
                .thenReturn(List.of(customDebito));

        List<PaymentMethodConfigResponse> matrix = configService.getMatrixForUser(userId);

        PaymentMethodConfigResponse debito = matrix.stream()
                .filter(m -> m.getPaymentMethod() == PaymentMethod.DEBITO)
                .findFirst()
                .orElseThrow();

        assertEquals(new BigDecimal("1.25"), debito.getMdrFeePercent());
        assertEquals(new BigDecimal("0.20"), debito.getFixedFeeAmount());
        assertTrue(debito.getIsCustomized());
        assertEquals(customDebito.getId(), debito.getId());
    }

    @Test
    @DisplayName("Deve atualizar matriz em lote (batch upsert) com sucesso")
    void shouldUpdateMatrixSuccessfully() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        PaymentMethodConfigRequest req = PaymentMethodConfigRequest.builder()
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .mdrFeePercent(new BigDecimal("2.99"))
                .fixedFeeAmount(new BigDecimal("0.35"))
                .settlementDays(30)
                .isActive(true)
                .build();

        when(configRepository.findByUserIdAndPaymentMethodAndInstallments(userId, PaymentMethod.CREDITO_A_VISTA, 1))
                .thenReturn(Optional.empty());

        when(configRepository.findByUserIdOrderByPaymentMethodAscInstallmentsAsc(userId))
                .thenReturn(Collections.emptyList());

        List<PaymentMethodConfigResponse> result = configService.updateMatrix(userId, List.of(req));

        assertNotNull(result);
        verify(configRepository).save(any(PaymentMethodConfig.class));
    }

    @Test
    @DisplayName("Deve lançar exceção se lista de atualização for vazia ou nula")
    void shouldThrowExceptionForEmptyUpdateRequest() {
        assertThrows(IllegalArgumentException.class, () -> configService.updateMatrix(userId, Collections.emptyList()));
        assertThrows(IllegalArgumentException.class, () -> configService.updateMatrix(userId, null));
    }

    @Test
    @DisplayName("Deve resolver configuração existente para o usuário")
    void shouldResolveSavedConfig() {
        PaymentMethodConfig config = PaymentMethodConfig.builder()
                .paymentMethod(PaymentMethod.PIX)
                .installments(1)
                .mdrFeePercent(BigDecimal.ZERO)
                .build();

        when(configRepository.findByUserIdAndPaymentMethodAndInstallments(userId, PaymentMethod.PIX, 1))
                .thenReturn(Optional.of(config));

        Optional<PaymentMethodConfig> resolved = configService.resolveConfig(userId, PaymentMethod.PIX, 1);
        assertTrue(resolved.isPresent());
        assertEquals(PaymentMethod.PIX, resolved.get().getPaymentMethod());
    }
}
