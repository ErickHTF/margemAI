package com.example.margemAI.service;

import com.example.margemAI.dto.request.GenerateRecurringPayablesRequest;
import com.example.margemAI.dto.request.PayableAccountRequest;
import com.example.margemAI.dto.request.PayablePaymentRequest;
import com.example.margemAI.dto.response.PayableAccountResponse;
import com.example.margemAI.dto.response.PayableSummaryResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.PayableAccount;
import com.example.margemAI.model.PayableStatus;
import com.example.margemAI.model.PayableType;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.PayableAccountRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayableAccountServiceTest {

    @Mock
    private PayableAccountRepository payableAccountRepository;

    @Mock
    private FixedCostRepository fixedCostRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PayableAccountService payableAccountService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .id(userId)
                .name("Empreendedor MEI")
                .email("mei@margem.ai")
                .cnpj("12.345.678/0001-90")
                .build();
    }

    @Test
    @DisplayName("Gera títulos recorrentes de custos fixos de forma estritamente idempotente")
    void deveGerarTitulosRecorrentesDeFormaIdempotente() {
        UUID fixedCostId = UUID.randomUUID();
        FixedCost rent = FixedCost.builder()
                .id(fixedCostId)
                .name("Aluguel do Ponto")
                .amount(new BigDecimal("1200.00"))
                .category(FixedCostCategory.ALUGUEL)
                .recurring(true)
                .active(true)
                .dueDate(LocalDate.of(2026, 1, 15))
                .user(user)
                .build();

        when(fixedCostRepository.findByUserId(userId)).thenReturn(List.of(rent));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(payableAccountRepository.existsByUserIdAndFixedCostIdAndCompetency(userId, fixedCostId, "2026-10"))
                .thenReturn(false);
        when(payableAccountRepository.save(any(PayableAccount.class))).thenAnswer(inv -> {
            PayableAccount acc = inv.getArgument(0);
            acc.setId(UUID.randomUUID());
            return acc;
        });

        GenerateRecurringPayablesRequest request = GenerateRecurringPayablesRequest.builder()
                .competency("2026-10")
                .build();

        List<PayableAccountResponse> generatedFirst = payableAccountService.generateRecurring(userId, request);
        assertEquals(1, generatedFirst.size());
        assertEquals("Aluguel do Ponto", generatedFirst.get(0).getDescription());
        assertEquals(new BigDecimal("1200.00"), generatedFirst.get(0).getTotalAmount());
        assertEquals(LocalDate.of(2026, 10, 15), generatedFirst.get(0).getDueDate());
        assertEquals(PayableStatus.PENDING, generatedFirst.get(0).getStatus());

        // Segunda chamada para a mesma competência: já existe no banco, deve ignorar e retornar vazio
        when(payableAccountRepository.existsByUserIdAndFixedCostIdAndCompetency(userId, fixedCostId, "2026-10"))
                .thenReturn(true);

        List<PayableAccountResponse> generatedSecond = payableAccountService.generateRecurring(userId, request);
        assertTrue(generatedSecond.isEmpty());
        verify(payableAccountRepository, times(1)).save(any(PayableAccount.class));
    }

    @Test
    @DisplayName("Ignora custos fixos não recorrentes na geração automática")
    void deveIgnorarCustosNaoRecorrentesNaGeracao() {
        FixedCost oneOff = FixedCost.builder()
                .id(UUID.randomUUID())
                .name("Pintura da Fachada")
                .amount(new BigDecimal("450.00"))
                .category(FixedCostCategory.MANUTENCAO)
                .recurring(false)
                .active(true)
                .user(user)
                .build();

        when(fixedCostRepository.findByUserId(userId)).thenReturn(List.of(oneOff));

        GenerateRecurringPayablesRequest request = GenerateRecurringPayablesRequest.builder()
                .competency("2026-10")
                .build();

        List<PayableAccountResponse> generated = payableAccountService.generateRecurring(userId, request);
        assertTrue(generated.isEmpty());
        verify(payableAccountRepository, never()).save(any(PayableAccount.class));
    }

    @Test
    @DisplayName("Aplica defaultDueDay quando custo fixo não tem dueDate definido")
    void deveAplicarDefaultDueDayQuandoCustoFixoNaoTemVencimento() {
        UUID costId = UUID.randomUUID();
        FixedCost cost = FixedCost.builder()
                .id(costId)
                .name("Software de Gestão")
                .amount(new BigDecimal("99.90"))
                .category(FixedCostCategory.SOFTWARE)
                .recurring(true)
                .active(true)
                .dueDate(null)
                .user(user)
                .build();

        when(fixedCostRepository.findByUserId(userId)).thenReturn(List.of(cost));
        when(userRepository.getReferenceById(userId)).thenReturn(user);
        when(payableAccountRepository.existsByUserIdAndFixedCostIdAndCompetency(userId, costId, "2026-10"))
                .thenReturn(false);
        when(payableAccountRepository.save(any(PayableAccount.class))).thenAnswer(inv -> inv.getArgument(0));

        GenerateRecurringPayablesRequest request = GenerateRecurringPayablesRequest.builder()
                .competency("2026-10")
                .defaultDueDay(25)
                .build();

        List<PayableAccountResponse> result = payableAccountService.generateRecurring(userId, request);
        assertEquals(1, result.size());
        assertEquals(LocalDate.of(2026, 10, 25), result.get(0).getDueDate());
    }

    @Test
    @DisplayName("Registra baixa parcial e atualiza saldo e status para PARTIAL")
    void deveRegistrarBaixaParcial() {
        UUID accountId = UUID.randomUUID();
        PayableAccount account = PayableAccount.builder()
                .id(accountId)
                .user(user)
                .description("Fornecedor de Tecidos")
                .totalAmount(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .dueDate(LocalDate.of(2026, 10, 20))
                .status(PayableStatus.PENDING)
                .build();

        when(payableAccountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));

        PayablePaymentRequest paymentRequest = PayablePaymentRequest.builder()
                .amount(new BigDecimal("400.00"))
                .notes("Pago primeira parcela no Pix")
                .build();

        PayableAccountResponse response = payableAccountService.pay(userId, accountId, paymentRequest);

        assertEquals(new BigDecimal("400.00"), response.getPaidAmount());
        assertEquals(new BigDecimal("600.00"), response.getRemainingAmount());
        assertEquals(PayableStatus.PARTIAL, response.getStatus());
        assertNotNull(response.getPaidAt());
        assertTrue(response.getNotes().contains("Pago primeira parcela no Pix"));
    }

    @Test
    @DisplayName("Registra baixa complementar até quitar totalmente e atualiza status para PAID")
    void deveQuitarContaComBaixaComplementar() {
        UUID accountId = UUID.randomUUID();
        PayableAccount account = PayableAccount.builder()
                .id(accountId)
                .user(user)
                .description("Energia Elétrica")
                .totalAmount(new BigDecimal("300.00"))
                .paidAmount(new BigDecimal("100.00"))
                .dueDate(LocalDate.of(2026, 10, 20))
                .status(PayableStatus.PARTIAL)
                .build();

        when(payableAccountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));

        PayablePaymentRequest secondPayment = PayablePaymentRequest.builder()
                .amount(new BigDecimal("200.00"))
                .notes("Quitação saldo restante")
                .build();

        PayableAccountResponse response = payableAccountService.pay(userId, accountId, secondPayment);

        assertEquals(new BigDecimal("300.00"), response.getPaidAmount());
        assertEquals(new BigDecimal("0.00"), response.getRemainingAmount());
        assertEquals(PayableStatus.PAID, response.getStatus());
    }

    @Test
    @DisplayName("Impede pagamento com valor superior ao saldo devedor")
    void deveImpedirPagamentoSuperiorAoSaldoDevedor() {
        UUID accountId = UUID.randomUUID();
        PayableAccount account = PayableAccount.builder()
                .id(accountId)
                .user(user)
                .description("Internet Fibra")
                .totalAmount(new BigDecimal("150.00"))
                .paidAmount(new BigDecimal("50.00"))
                .dueDate(LocalDate.of(2026, 10, 20))
                .status(PayableStatus.PARTIAL)
                .build();

        when(payableAccountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));

        PayablePaymentRequest excessPayment = PayablePaymentRequest.builder()
                .amount(new BigDecimal("100.01"))
                .build();

        InvalidRequestException ex = assertThrows(InvalidRequestException.class, () ->
                payableAccountService.pay(userId, accountId, excessPayment)
        );
        assertTrue(ex.getMessage().contains("não pode ser maior que o saldo em aberto"));
    }

    @Test
    @DisplayName("Estorna pagamento restaurando paidAmount a zero, status PENDING e preservando rastreabilidade")
    void deveEstornarPagamentoPreservandoRastreabilidade() {
        UUID accountId = UUID.randomUUID();
        PayableAccount account = PayableAccount.builder()
                .id(accountId)
                .user(user)
                .description("Taxa DAS-MEI")
                .totalAmount(new BigDecimal("75.00"))
                .paidAmount(new BigDecimal("75.00"))
                .dueDate(LocalDate.of(2026, 10, 20))
                .status(PayableStatus.PAID)
                .paidAt(LocalDateTime.now())
                .notes("Pago no aplicativo do banco")
                .build();

        when(payableAccountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));

        PayableAccountResponse response = payableAccountService.reverse(userId, accountId);

        assertEquals(new BigDecimal("0.00"), response.getPaidAmount());
        assertEquals(new BigDecimal("75.00"), response.getRemainingAmount());
        assertEquals(PayableStatus.PENDING, response.getStatus());
        assertNull(response.getPaidAt());
        assertTrue(response.getNotes().contains("Estorno de R$ 75.00"));
        assertTrue(response.getNotes().contains("Pago no aplicativo do banco"));
    }

    @Test
    @DisplayName("Rejeita estorno em título pendente sem pagamento registrado")
    void deveRejeitarEstornoEmTituloSemPagamento() {
        UUID accountId = UUID.randomUUID();
        PayableAccount account = PayableAccount.builder()
                .id(accountId)
                .user(user)
                .description("Aluguel")
                .totalAmount(new BigDecimal("1000.00"))
                .paidAmount(BigDecimal.ZERO)
                .dueDate(LocalDate.of(2026, 10, 20))
                .status(PayableStatus.PENDING)
                .build();

        when(payableAccountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.of(account));

        assertThrows(InvalidRequestException.class, () ->
                payableAccountService.reverse(userId, accountId)
        );
    }

    @Test
    @DisplayName("Calcula corretamente indicadores separando regime de competência e desembolso efetivo de caixa")
    void deveCalcularIndicadoresSeparandoDespesaEDesembolso() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        LocalDate tomorrow = today.plusDays(1);

        // 1. Título PENDENTE vencido: 500 total, 0 pago -> despesa 500, aberto 500, vencido 500
        PayableAccount overdueAcc = PayableAccount.builder()
                .id(UUID.randomUUID())
                .user(user)
                .competency("2026-10")
                .description("Fornecedor Atrasado")
                .dueDate(yesterday)
                .totalAmount(new BigDecimal("500.00"))
                .paidAmount(new BigDecimal("0.00"))
                .status(PayableStatus.PENDING)
                .build();

        // 2. Título QUITADO: 300 total, 300 pago -> despesa 300, desembolso 300, aberto 0, vencido 0
        PayableAccount paidAcc = PayableAccount.builder()
                .id(UUID.randomUUID())
                .user(user)
                .competency("2026-10")
                .description("DAS-MEI")
                .dueDate(yesterday)
                .totalAmount(new BigDecimal("300.00"))
                .paidAmount(new BigDecimal("300.00"))
                .status(PayableStatus.PAID)
                .build();

        // 3. Título PARCIAL a vencer: 800 total, 200 pago -> despesa 800, desembolso 200, aberto 600, vencido 0
        PayableAccount partialAcc = PayableAccount.builder()
                .id(UUID.randomUUID())
                .user(user)
                .competency("2026-10")
                .description("Aluguel")
                .dueDate(tomorrow)
                .totalAmount(new BigDecimal("800.00"))
                .paidAmount(new BigDecimal("200.00"))
                .status(PayableStatus.PARTIAL)
                .build();

        List<PayableAccount> list = List.of(overdueAcc, paidAcc, partialAcc);

        when(payableAccountRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(list);
        when(payableAccountRepository.findByUserIdAndCompetency(userId, "2026-10")).thenReturn(list);

        PayableSummaryResponse summary = payableAccountService.findAll(
                userId, "2026-10", null, null, null, null, null
        );

        // Despesa compromissada na competência (regime de competência): 500 + 300 + 800 = 1600.00
        assertEquals(new BigDecimal("1600.00"), summary.getTotalCommittedExpense());

        // Desembolso efetivo pago (regime de caixa): 0 + 300 + 200 = 500.00
        assertEquals(new BigDecimal("500.00"), summary.getTotalEffectiveDisbursement());

        // Saldo em aberto: 500 + 0 + 600 = 1100.00
        assertEquals(new BigDecimal("1100.00"), summary.getTotalOpenPayable());

        // Saldo vencido: 500.00
        assertEquals(new BigDecimal("500.00"), summary.getTotalOverduePayable());

        assertEquals(3, summary.getItems().size());
    }

    @Test
    @DisplayName("Garante isolamento por usuário: lança ResourceNotFoundException para conta de outro usuário")
    void deveGarantirIsolamentoPorUsuario() {
        UUID accountId = UUID.randomUUID();
        when(payableAccountRepository.findByIdAndUserId(accountId, userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
                payableAccountService.findById(userId, accountId)
        );

        assertThrows(ResourceNotFoundException.class, () ->
                payableAccountService.delete(userId, accountId)
        );
    }
}
