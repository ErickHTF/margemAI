package com.example.margemAI.controller;

import com.example.margemAI.dto.request.GenerateRecurringPayablesRequest;
import com.example.margemAI.dto.request.PayableAccountRequest;
import com.example.margemAI.dto.request.PayablePaymentRequest;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.PayableAccount;
import com.example.margemAI.model.PayableStatus;
import com.example.margemAI.model.PayableType;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.PayableAccountRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.security.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class PayableAccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PayableAccountRepository payableAccountRepository;

    @Autowired
    private FixedCostRepository fixedCostRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User savedUser;
    private String accessToken;

    @BeforeEach
    void setUp() {
        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("COMERCIO")
                        .name("Comércio Geral")
                        .active(true)
                        .build()));

        savedUser = userRepository.save(User.builder()
                .name("Carlos MEI")
                .email("carlos.mei@example.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("11222333000144")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private String bearer() {
        return "Bearer " + accessToken;
    }

    @Test
    @DisplayName("Cria conta a pagar pontual com sucesso")
    void deveCriarContaAPagarComSucesso() throws Exception {
        PayableAccountRequest request = PayableAccountRequest.builder()
                .description("Compra de Embalagens")
                .category("OUTRO")
                .dueDate(LocalDate.of(2026, 11, 10))
                .totalAmount(new BigDecimal("250.00"))
                .type(PayableType.ONE_OFF)
                .notes("Pedido #104")
                .build();

        mockMvc.perform(post("/v1/payables")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.description").value("Compra de Embalagens"))
                .andExpect(jsonPath("$.totalAmount").value(250.00))
                .andExpect(jsonPath("$.paidAmount").value(0.00))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.competency").value("2026-11"));
    }

    @Test
    @DisplayName("Gera contas a pagar recorrentes a partir dos custos fixos de forma idempotente")
    void deveGerarRecorrentesDeFormaIdempotente() throws Exception {
        fixedCostRepository.save(FixedCost.builder()
                .name("Aluguel da Loja")
                .amount(new BigDecimal("1500.00"))
                .category(FixedCostCategory.ALUGUEL)
                .dueDate(LocalDate.of(2026, 1, 10))
                .recurring(true)
                .active(true)
                .user(savedUser)
                .build());

        GenerateRecurringPayablesRequest request = GenerateRecurringPayablesRequest.builder()
                .competency("2026-10")
                .build();

        // 1ª execução: gera 1 título
        mockMvc.perform(post("/v1/payables/generate-recurring")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].description").value("Aluguel da Loja"))
                .andExpect(jsonPath("$[0].totalAmount").value(1500.00));

        // 2ª execução na mesma competência: estritamente idempotente (não duplica!)
        mockMvc.perform(post("/v1/payables/generate-recurring")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("Registra baixa parcial e complementar até quitar conta a pagar")
    void deveRegistrarBaixaParcialEComplementar() throws Exception {
        PayableAccount account = payableAccountRepository.save(PayableAccount.builder()
                .user(savedUser)
                .description("Internet Banda Larga")
                .category("INTERNET")
                .dueDate(LocalDate.of(2026, 10, 25))
                .totalAmount(new BigDecimal("120.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.RECURRING)
                .build());

        // Baixa parcial de R$ 50.00
        PayablePaymentRequest payment1 = PayablePaymentRequest.builder()
                .amount(new BigDecimal("50.00"))
                .notes("Primeira parte")
                .build();

        mockMvc.perform(post("/v1/payables/" + account.getId() + "/pay")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payment1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidAmount").value(50.00))
                .andExpect(jsonPath("$.remainingAmount").value(70.00))
                .andExpect(jsonPath("$.status").value("PARTIAL"));

        // Baixa complementar de R$ 70.00 até quitar
        PayablePaymentRequest payment2 = PayablePaymentRequest.builder()
                .amount(new BigDecimal("70.00"))
                .notes("Quitação total")
                .build();

        mockMvc.perform(post("/v1/payables/" + account.getId() + "/pay")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payment2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidAmount").value(120.00))
                .andExpect(jsonPath("$.remainingAmount").value(0.00))
                .andExpect(jsonPath("$.status").value("PAID"));
    }

    @Test
    @DisplayName("Estorna pagamento mantendo o histórico mesmo com observações no limite de 500 caracteres")
    void deveEstornarPagamentoComSucesso() throws Exception {
        String fullNotes = "x".repeat(500);
        PayableAccount account = payableAccountRepository.save(PayableAccount.builder()
                .user(savedUser)
                .description("Contabilidade Mensal")
                .category("CONTABILIDADE")
                .dueDate(LocalDate.of(2026, 10, 15))
                .totalAmount(new BigDecimal("200.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.RECURRING)
                .notes(fullNotes)
                .build());

        pay(account, "200.00", LocalDateTime.of(2026, 10, 14, 11, 0), "y".repeat(500));

        mockMvc.perform(post("/v1/payables/" + account.getId() + "/reverse")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidAmount").value(0.00))
                .andExpect(jsonPath("$.remainingAmount").value(200.00))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.notes").value(fullNotes))
                .andExpect(jsonPath("$.payments.length()").value(1))
                .andExpect(jsonPath("$.payments[0].amount").value(200.00))
                .andExpect(jsonPath("$.payments[0].reversedAt").isNotEmpty());
        payableAccountRepository.flush();
    }

    private void pay(PayableAccount account, String amount, LocalDateTime paidAt, String notes) throws Exception {
        PayablePaymentRequest payment = PayablePaymentRequest.builder()
                .amount(new BigDecimal(amount))
                .paidAt(paidAt)
                .notes(notes)
                .build();
        mockMvc.perform(post("/v1/payables/" + account.getId() + "/pay")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payment)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Lista contas a pagar retornando indicadores de regime de competência e caixa")
    void deveListarContasERetornarIndicadoresSeparados() throws Exception {
        PayableAccount rent = payableAccountRepository.save(PayableAccount.builder()
                .user(savedUser)
                .description("Aluguel")
                .category("ALUGUEL")
                .dueDate(LocalDate.now().plusDays(5))
                .totalAmount(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.RECURRING)
                .build());

        PayableAccount das = payableAccountRepository.save(PayableAccount.builder()
                .user(savedUser)
                .description("DAS-MEI")
                .category("DAS_MEI")
                .dueDate(LocalDate.now().plusDays(2))
                .totalAmount(new BigDecimal("75.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.RECURRING)
                .build());

        pay(rent, "400.00", LocalDateTime.of(2026, 10, 5, 9, 0), null);
        pay(das, "75.00", LocalDateTime.of(2026, 10, 20, 9, 0), null);

        mockMvc.perform(get("/v1/payables")
                        .header("Authorization", bearer())
                        .param("competency", "2026-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCommittedExpense").value(1075.00))
                .andExpect(jsonPath("$.totalEffectiveDisbursement").value(475.00))
                .andExpect(jsonPath("$.totalOpenPayable").value(600.00))
                .andExpect(jsonPath("$.totalOverduePayable").value(0.00))
                .andExpect(jsonPath("$.items.length()").value(2));
    }

    @Test
    @DisplayName("Atribui o desembolso ao mês em que cada pagamento ocorreu, não à competência do título")
    void deveAtribuirDesembolsoAoMesDoPagamento() throws Exception {
        PayableAccount october = payableAccountRepository.save(PayableAccount.builder()
                .user(savedUser)
                .description("Fornecedor de Outubro")
                .category("OUTRO")
                .dueDate(LocalDate.of(2026, 10, 30))
                .totalAmount(new BigDecimal("900.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.ONE_OFF)
                .build());

        pay(october, "250.00", LocalDateTime.of(2026, 10, 31, 23, 59), null);
        pay(october, "320.00", LocalDateTime.of(2026, 11, 1, 0, 0), null);
        pay(october, "110.00", LocalDateTime.of(2026, 11, 18, 15, 0), null);

        mockMvc.perform(get("/v1/payables")
                        .header("Authorization", bearer())
                        .param("competency", "2026-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCommittedExpense").value(900.00))
                .andExpect(jsonPath("$.totalEffectiveDisbursement").value(250.00))
                .andExpect(jsonPath("$.items[0].payments.length()").value(3));

        mockMvc.perform(get("/v1/payables")
                        .header("Authorization", bearer())
                        .param("competency", "2026-11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCommittedExpense").value(0.00))
                .andExpect(jsonPath("$.totalEffectiveDisbursement").value(430.00));

        mockMvc.perform(post("/v1/payables/" + october.getId() + "/reverse")
                        .header("Authorization", bearer()))
                .andExpect(status().isOk());

        mockMvc.perform(get("/v1/payables")
                        .header("Authorization", bearer())
                        .param("competency", "2026-11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEffectiveDisbursement").value(0.00));
    }

    @Test
    @DisplayName("Banco impede dois títulos do mesmo custo fixo na mesma competência")
    void deveImpedirTituloRecorrenteDuplicadoNoBanco() {
        UUID fixedCostId = UUID.randomUUID();
        payableAccountRepository.saveAndFlush(recurringFor(fixedCostId));

        assertThrows(DataIntegrityViolationException.class,
                () -> payableAccountRepository.saveAndFlush(recurringFor(fixedCostId)));
    }

    @Test
    @DisplayName("Retorna 409 ao editar conta recorrente para competência já gerada do mesmo custo fixo")
    void deveRetornarConflitoAoEditarParaCompetenciaJaGerada() throws Exception {
        UUID fixedCostId = UUID.randomUUID();
        payableAccountRepository.saveAndFlush(recurringFor(fixedCostId));
        PayableAccount november = recurringFor(fixedCostId);
        november.setCompetency("2026-11");
        november.setDueDate(LocalDate.of(2026, 11, 10));
        november = payableAccountRepository.saveAndFlush(november);

        PayableAccountRequest request = PayableAccountRequest.builder()
                .description("Aluguel da Loja")
                .competency("2026-10")
                .dueDate(LocalDate.of(2026, 10, 10))
                .totalAmount(new BigDecimal("1500.00"))
                .build();

        mockMvc.perform(put("/v1/payables/" + november.getId())
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Já existe uma conta a pagar deste custo fixo para a competência informada."));
    }

    private PayableAccount recurringFor(UUID fixedCostId) {
        return PayableAccount.builder()
                .user(savedUser)
                .fixedCostId(fixedCostId)
                .description("Aluguel da Loja")
                .category("ALUGUEL")
                .dueDate(LocalDate.of(2026, 10, 10))
                .totalAmount(new BigDecimal("1500.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.RECURRING)
                .build();
    }

    @Test
    @DisplayName("Garante isolamento: não permite acessar ou baixar conta de outro usuário")
    void deveGarantirIsolamentoEntreUsuarios() throws Exception {
        User otherUser = userRepository.save(User.builder()
                .name("Outro Titular")
                .email("outro.titular@example.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("99888777000166")
                .segment(savedUser.getSegment())
                .build());

        PayableAccount otherAccount = payableAccountRepository.save(PayableAccount.builder()
                .user(otherUser)
                .description("Seguro de Vida do Outro")
                .category("SEGUROS")
                .dueDate(LocalDate.of(2026, 10, 20))
                .totalAmount(new BigDecimal("80.00"))
                .paidAmount(BigDecimal.ZERO)
                .status(PayableStatus.PENDING)
                .competency("2026-10")
                .type(PayableType.ONE_OFF)
                .build());

        mockMvc.perform(get("/v1/payables/" + otherAccount.getId())
                        .header("Authorization", bearer()))
                .andExpect(status().isNotFound());

        PayablePaymentRequest payment = PayablePaymentRequest.builder()
                .amount(new BigDecimal("80.00"))
                .build();

        mockMvc.perform(post("/v1/payables/" + otherAccount.getId() + "/pay")
                        .header("Authorization", bearer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payment)))
                .andExpect(status().isNotFound());
    }
}
