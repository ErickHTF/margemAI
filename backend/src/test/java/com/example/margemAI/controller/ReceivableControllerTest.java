package com.example.margemAI.controller;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Receivable;
import com.example.margemAI.model.ReceivableInstallment;
import com.example.margemAI.model.ReceivableStatus;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.ReceivableInstallmentRepository;
import com.example.margemAI.repository.ReceivableRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.security.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("Testes de integração REST do ReceivableController (Contas a Receber)")
class ReceivableControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    @Autowired
    private ReceivableRepository receivableRepository;

    @Autowired
    private ReceivableInstallmentRepository installmentRepository;

    @Autowired
    private JwtService jwtService;

    private User user;
    private User otherUser;
    private String token;
    private String otherToken;

    @BeforeEach
    void setup() {
        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO").orElseThrow();

        user = userRepository.save(User.builder()
                .name("MEI Titular")
                .email("receivables.titular@test.com")
                .password("hash123")
                .cnpj("12345678000188")
                .segment(segment)
                .build());

        otherUser = userRepository.save(User.builder()
                .name("MEI Terceiro")
                .email("receivables.terceiro@test.com")
                .password("hash123")
                .cnpj("12345678000199")
                .segment(segment)
                .build());

        token = "Bearer " + jwtService.generateAccessToken(user);
        otherToken = "Bearer " + jwtService.generateAccessToken(otherUser);
    }

    @Test
    @DisplayName("Exige autenticação e lista apenas os títulos do usuário autenticado")
    void shouldEnforceAuthenticationAndUserIsolation() throws Exception {
        mvc.perform(get("/receivables")).andExpect(status().isUnauthorized());

        // Cria 1 receivable para user e 1 para otherUser
        Receivable r1 = receivableRepository.save(Receivable.builder()
                .user(user)
                .description("Venda Própria")
                .grossAmount(new BigDecimal("150.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("150.00"))
                .receivedAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.PIX)
                .installments(1)
                .status(ReceivableStatus.PENDING)
                .issuedAt(LocalDate.now())
                .installmentList(new ArrayList<>())
                .build());

        receivableRepository.save(Receivable.builder()
                .user(otherUser)
                .description("Venda Alheia")
                .grossAmount(new BigDecimal("300.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("300.00"))
                .receivedAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.PIX)
                .installments(1)
                .status(ReceivableStatus.PENDING)
                .issuedAt(LocalDate.now())
                .installmentList(new ArrayList<>())
                .build());

        mvc.perform(get("/receivables").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCount").value(1))
                .andExpect(jsonPath("$.receivables.content", hasSize(1)))
                .andExpect(jsonPath("$.receivables.content[0].description").value("Venda Própria"))
                .andExpect(jsonPath("$.totalSoldGross").value(150.00))
                .andExpect(jsonPath("$.totalSoldNet").value(150.00));
    }

    @Test
    @DisplayName("Cria título manual em 3 parcelas com divisão exata de centavos (100 -> 33,33 + 33,33 + 33,34)")
    void shouldCreateManualReceivableWithExactCents() throws Exception {
        String payload = """
                {
                  "description": "Contrato de Consultoria 3x",
                  "grossAmount": 100.00,
                  "paymentMethod": "CREDITO_PARCELADO",
                  "installments": 3,
                  "issuedAt": "%s"
                }
                """.formatted(LocalDate.now());

        mvc.perform(post("/receivables")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Contrato de Consultoria 3x"))
                .andExpect(jsonPath("$.grossAmount").value(100.00))
                .andExpect(jsonPath("$.installments", hasSize(3)))
                .andExpect(jsonPath("$.installments[0].grossAmount").value(33.33))
                .andExpect(jsonPath("$.installments[1].grossAmount").value(33.33))
                .andExpect(jsonPath("$.installments[2].grossAmount").value(33.34));
    }

    @Test
    @DisplayName("Realiza baixa parcial, baixa total e estorno de parcela com isolamento por usuário")
    void shouldSettleAndReverseInstallmentSuccessfully() throws Exception {
        // Cria título com 1 parcela de R$ 80,00
        Receivable r = receivableRepository.save(Receivable.builder()
                .user(user)
                .description("Venda no Cartão")
                .grossAmount(new BigDecimal("80.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("80.00"))
                .receivedAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .status(ReceivableStatus.PENDING)
                .issuedAt(LocalDate.now())
                .installmentList(new ArrayList<>())
                .build());

        ReceivableInstallment installment = installmentRepository.save(ReceivableInstallment.builder()
                .receivable(r)
                .installmentNumber(1)
                .totalInstallments(1)
                .dueDate(LocalDate.now().plusDays(30))
                .grossAmount(new BigDecimal("80.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("80.00"))
                .receivedAmount(BigDecimal.ZERO)
                .status(com.example.margemAI.model.InstallmentStatus.PENDING)
                .build());

        r.getInstallmentList().add(installment);
        receivableRepository.save(r);

        // 1. Baixa parcial de R$ 30,00
        String partialPayload = """
                {
                  "amount": 30.00,
                  "notes": "Primeira parcela adiantada"
                }
                """;

        mvc.perform(post("/receivables/installments/{id}/settle", installment.getId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(partialPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receivedAmount").value(30.00))
                .andExpect(jsonPath("$.remainingAmount").value(50.00))
                .andExpect(jsonPath("$.status").value("PARTIAL"));

        // 2. Outro usuário tenta baixar a parcela -> 404 Not Found
        mvc.perform(post("/receivables/installments/{id}/settle", installment.getId())
                        .header("Authorization", otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(partialPayload))
                .andExpect(status().isNotFound());

        // 3. Baixa total do restante (R$ 50,00) sem passar amount
        mvc.perform(post("/receivables/installments/{id}/settle", installment.getId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receivedAmount").value(80.00))
                .andExpect(jsonPath("$.remainingAmount").value(0.00))
                .andExpect(jsonPath("$.status").value("RECEIVED"));

        // 4. Estorno da baixa
        String reversePayload = """
                {
                  "reason": "Cancelamento de transação"
                }
                """;

        mvc.perform(post("/receivables/installments/{id}/reverse", installment.getId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reversePayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.receivedAmount").value(0.00))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reversalReason").value("Cancelamento de transação"));
    }

    @Test
    @DisplayName("Distingue venda realizada (competência) de recebimento efetivo (caixa) e atrasos nos totalizadores")
    void shouldDistinguishSoldFromReceivedAndOverdue() throws Exception {
        // Título 1: R$ 100,00 emitido, recebido R$ 40,00 (saldo R$ 60 no prazo)
        Receivable r1 = receivableRepository.save(Receivable.builder()
                .user(user)
                .description("Venda 1")
                .grossAmount(new BigDecimal("100.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .receivedAmount(new BigDecimal("40.00"))
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .status(ReceivableStatus.PARTIALLY_RECEIVED)
                .issuedAt(LocalDate.now())
                .installmentList(new ArrayList<>())
                .build());

        ReceivableInstallment i1 = installmentRepository.save(ReceivableInstallment.builder()
                .receivable(r1)
                .installmentNumber(1)
                .totalInstallments(1)
                .dueDate(LocalDate.now().plusDays(20))
                .grossAmount(new BigDecimal("100.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .receivedAmount(new BigDecimal("40.00"))
                .status(com.example.margemAI.model.InstallmentStatus.PARTIAL)
                .build());
        r1.getInstallmentList().add(i1);

        // Título 2: R$ 50,00 emitido, vencido há 5 dias (R$ 50 em atraso)
        Receivable r2 = receivableRepository.save(Receivable.builder()
                .user(user)
                .description("Venda 2 em atraso")
                .grossAmount(new BigDecimal("50.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("50.00"))
                .receivedAmount(BigDecimal.ZERO)
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .status(ReceivableStatus.OVERDUE)
                .issuedAt(LocalDate.now().minusDays(35))
                .installmentList(new ArrayList<>())
                .build());

        ReceivableInstallment i2 = installmentRepository.save(ReceivableInstallment.builder()
                .receivable(r2)
                .installmentNumber(1)
                .totalInstallments(1)
                .dueDate(LocalDate.now().minusDays(5)) // vencida!
                .grossAmount(new BigDecimal("50.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("50.00"))
                .receivedAmount(BigDecimal.ZERO)
                .status(com.example.margemAI.model.InstallmentStatus.PENDING)
                .build());
        r2.getInstallmentList().add(i2);

        receivableRepository.save(r1);
        receivableRepository.save(r2);

        mvc.perform(get("/receivables").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSoldGross").value(150.00))
                .andExpect(jsonPath("$.totalSoldNet").value(150.00))
                .andExpect(jsonPath("$.totalReceivedEffectively").value(40.00))
                .andExpect(jsonPath("$.totalPending").value(60.00))
                .andExpect(jsonPath("$.totalOverdue").value(50.00));
    }
}
