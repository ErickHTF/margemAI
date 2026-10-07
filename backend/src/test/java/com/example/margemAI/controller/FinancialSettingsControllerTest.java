package com.example.margemAI.controller;

import com.example.margemAI.dto.request.PaymentMethodConfigRequest;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.User;
import com.example.margemAI.service.PaymentMethodConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class FinancialSettingsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PaymentMethodConfigService configService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("mei@financeiro.com")
                .name("Empreendedor Teste")
                .build();

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("Deve retornar matriz de formas de pagamento com sucesso (status 200)")
    void shouldReturnPaymentMethodsMatrix() throws Exception {
        PaymentMethodConfigResponse resp = PaymentMethodConfigResponse.builder()
                .id(UUID.randomUUID())
                .paymentMethod(PaymentMethod.DEBITO)
                .description("Cartão de Débito")
                .installments(1)
                .mdrFeePercent(new BigDecimal("1.50"))
                .fixedFeeAmount(BigDecimal.ZERO)
                .settlementDays(1)
                .isActive(true)
                .isCustomized(false)
                .build();

        when(configService.getMatrixForUser(userId)).thenReturn(List.of(resp));

        mockMvc.perform(get("/v1/settings/financial/payment-methods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].paymentMethod").value("DEBITO"))
                .andExpect(jsonPath("$[0].mdrFeePercent").value(1.50))
                .andExpect(jsonPath("$[0].settlementDays").value(1));
    }

    @Test
    @DisplayName("Deve atualizar matriz de formas de pagamento em lote com sucesso (status 200)")
    void shouldUpdatePaymentMethodsMatrix() throws Exception {
        PaymentMethodConfigRequest req = PaymentMethodConfigRequest.builder()
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .mdrFeePercent(new BigDecimal("2.90"))
                .fixedFeeAmount(new BigDecimal("0.50"))
                .settlementDays(30)
                .isActive(true)
                .build();

        PaymentMethodConfigResponse resp = PaymentMethodConfigResponse.builder()
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .description("Crédito à Vista")
                .installments(1)
                .mdrFeePercent(new BigDecimal("2.90"))
                .fixedFeeAmount(new BigDecimal("0.50"))
                .settlementDays(30)
                .isActive(true)
                .isCustomized(true)
                .build();

        when(configService.updateMatrix(eq(userId), any())).thenReturn(List.of(resp));

        mockMvc.perform(put("/v1/settings/financial/payment-methods")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(req))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].paymentMethod").value("CREDITO_A_VISTA"))
                .andExpect(jsonPath("$[0].mdrFeePercent").value(2.90))
                .andExpect(jsonPath("$[0].fixedFeeAmount").value(0.50));
    }

    @Test
    @DisplayName("Deve retornar 401 Unauthorized ao acessar sem autenticação")
    void shouldReturnUnauthorizedWithoutAuth() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(get("/v1/settings/financial/payment-methods"))
                .andExpect(status().isUnauthorized());
    }
}
