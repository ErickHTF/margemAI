package com.example.margemAI.service;

import com.example.margemAI.dto.request.ReceivableRequest;
import com.example.margemAI.dto.request.ReverseInstallmentRequest;
import com.example.margemAI.dto.request.SettleInstallmentRequest;
import com.example.margemAI.dto.response.ReceivableInstallmentResponse;
import com.example.margemAI.dto.response.ReceivableResponse;
import com.example.margemAI.dto.response.ReceivableSummaryResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.InstallmentStatus;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import com.example.margemAI.model.Receivable;
import com.example.margemAI.model.ReceivableInstallment;
import com.example.margemAI.model.ReceivableStatus;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.ReceivableInstallmentRepository;
import com.example.margemAI.repository.ReceivableRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Testes de regras de negócio de Contas a Receber (ReceivableService)")
class ReceivableServiceTest {

    @Mock
    private ReceivableRepository receivableRepository;

    @Mock
    private ReceivableInstallmentRepository installmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PaymentMethodConfigService paymentMethodConfigService;

    @Mock
    private PaymentFeeCalculator paymentFeeCalculator;

    @InjectMocks
    private ReceivableService receivableService;

    private User testUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        testUser = User.builder()
                .id(userId)
                .name("Empreendedor MEI")
                .email("mei@margem.ai")
                .build();
    }

    @Test
    @DisplayName("Divisão exata de centavos em 3 parcelas (R$ 100,00 -> 33,33 + 33,33 + 33,34)")
    void shouldGenerateExactCentsForThreeInstallments() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(paymentMethodConfigService.resolveConfig(eq(userId), eq(PaymentMethod.CREDITO_PARCELADO), eq(3)))
                .thenReturn(Optional.of(PaymentMethodConfig.builder().settlementDays(30).build()));

        when(paymentFeeCalculator.calculate(eq(userId), eq(BigDecimal.ONE), eq(new BigDecimal("100.00")),
                eq(PaymentMethod.CREDITO_PARCELADO), eq(3), any()))
                .thenReturn(new PaymentFeeCalculator.FeeCalculationResult(
                        new BigDecimal("100.00"),
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        BigDecimal.ZERO,
                        new BigDecimal("100.00")
                ));

        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> {
            Receivable r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        ReceivableRequest request = ReceivableRequest.builder()
                .description("Venda parcelada em 3x")
                .grossAmount(new BigDecimal("100.00"))
                .paymentMethod(PaymentMethod.CREDITO_PARCELADO)
                .installments(3)
                .issuedAt(LocalDate.of(2026, 3, 1))
                .build();

        ReceivableResponse response = receivableService.create(userId, request);

        ArgumentCaptor<Receivable> captor = ArgumentCaptor.forClass(Receivable.class);
        verify(receivableRepository).save(captor.capture());
        Receivable saved = captor.getValue();

        List<ReceivableInstallment> installments = saved.getInstallmentList();
        assertEquals(3, installments.size());

        assertEquals(new BigDecimal("33.33"), installments.get(0).getGrossAmount());
        assertEquals(new BigDecimal("33.33"), installments.get(1).getGrossAmount());
        assertEquals(new BigDecimal("33.34"), installments.get(2).getGrossAmount());

        BigDecimal sumGross = installments.stream()
                .map(ReceivableInstallment::getGrossAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("100.00"), sumGross);

        BigDecimal sumNet = installments.stream()
                .map(ReceivableInstallment::getNetAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(new BigDecimal("100.00"), sumNet);

        // Vencimentos escalonados a partir de 30 dias: 31/03, 30/04, 30/05
        assertEquals(LocalDate.of(2026, 3, 31), installments.get(0).getDueDate());
        assertEquals(LocalDate.of(2026, 4, 30), installments.get(1).getDueDate());
        assertEquals(LocalDate.of(2026, 5, 30), installments.get(2).getDueDate());
    }

    @Test
    @DisplayName("Cria título e parcelas automaticamente a partir de venda registrada")
    void shouldCreateReceivableFromSale() {
        UUID saleId = UUID.randomUUID();
        Sale sale = Sale.builder()
                .id(saleId)
                .user(testUser)
                .description("Produto Balcão")
                .grossAmount(new BigDecimal("80.00"))
                .feeAmount(new BigDecimal("2.56"))
                .netAmount(new BigDecimal("77.44"))
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .soldAt(LocalDateTime.of(2026, 4, 1, 10, 0))
                .build();

        when(receivableRepository.findBySaleIdAndUserId(saleId, userId)).thenReturn(Optional.empty());
        when(paymentMethodConfigService.resolveConfig(eq(userId), eq(PaymentMethod.CREDITO_A_VISTA), eq(1)))
                .thenReturn(Optional.of(PaymentMethodConfig.builder().settlementDays(30).build()));
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        Receivable receivable = receivableService.createFromSale(sale);

        assertNotNull(receivable);
        assertEquals(saleId, receivable.getSale().getId());
        assertEquals(new BigDecimal("80.00"), receivable.getGrossAmount());
        assertEquals(new BigDecimal("77.44"), receivable.getNetAmount());
        assertEquals(1, receivable.getInstallmentList().size());
        assertEquals(LocalDate.of(2026, 5, 1), receivable.getInstallmentList().get(0).getDueDate());
    }

    @Test
    @DisplayName("Exclui título a receber quando venda vinculada é excluída")
    void shouldDeleteReceivableOnSaleDeleted() {
        UUID saleId = UUID.randomUUID();
        Receivable receivable = Receivable.builder().id(UUID.randomUUID()).user(testUser).build();
        when(receivableRepository.findBySaleIdAndUserId(saleId, userId)).thenReturn(Optional.of(receivable));

        receivableService.deleteBySaleId(userId, saleId);

        verify(receivableRepository).delete(receivable);
    }

    @Test
    @DisplayName("Realiza baixa parcial acumulando valor e marcando status PARTIAL")
    void shouldSettleInstallmentPartially() {
        UUID installmentId = UUID.randomUUID();
        Receivable receivable = Receivable.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .grossAmount(new BigDecimal("100.00"))
                .netAmount(new BigDecimal("100.00"))
                .status(ReceivableStatus.PENDING)
                .build();

        ReceivableInstallment installment = ReceivableInstallment.builder()
                .id(installmentId)
                .receivable(receivable)
                .installmentNumber(1)
                .totalInstallments(1)
                .grossAmount(new BigDecimal("100.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .receivedAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PENDING)
                .dueDate(LocalDate.now().plusDays(10))
                .build();

        receivable.setInstallmentList(new ArrayList<>(List.of(installment)));

        when(installmentRepository.findByIdAndUserId(installmentId, userId)).thenReturn(Optional.of(installment));
        when(installmentRepository.save(any(ReceivableInstallment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        SettleInstallmentRequest request = SettleInstallmentRequest.builder()
                .amount(new BigDecimal("40.00"))
                .receivedAt(LocalDate.now())
                .notes("Recebido adiantamento de 40%")
                .build();

        ReceivableInstallmentResponse response = receivableService.settle(userId, installmentId, request);

        assertEquals(new BigDecimal("40.00"), response.getReceivedAmount());
        assertEquals(new BigDecimal("60.00"), response.getRemainingAmount());
        assertEquals(InstallmentStatus.PARTIAL, response.getStatus());
        assertEquals(ReceivableStatus.PARTIALLY_RECEIVED, receivable.getStatus());
    }

    @Test
    @DisplayName("Realiza baixa total completando saldo e marcando status RECEIVED")
    void shouldSettleInstallmentTotally() {
        UUID installmentId = UUID.randomUUID();
        Receivable receivable = Receivable.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .grossAmount(new BigDecimal("100.00"))
                .netAmount(new BigDecimal("100.00"))
                .status(ReceivableStatus.PENDING)
                .build();

        ReceivableInstallment installment = ReceivableInstallment.builder()
                .id(installmentId)
                .receivable(receivable)
                .installmentNumber(1)
                .totalInstallments(1)
                .grossAmount(new BigDecimal("100.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .receivedAmount(new BigDecimal("40.00"))
                .status(InstallmentStatus.PARTIAL)
                .dueDate(LocalDate.now().plusDays(5))
                .build();

        receivable.setInstallmentList(new ArrayList<>(List.of(installment)));

        when(installmentRepository.findByIdAndUserId(installmentId, userId)).thenReturn(Optional.of(installment));
        when(installmentRepository.save(any(ReceivableInstallment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        // Sem amount no request -> baixa total do restante (R$ 60,00)
        SettleInstallmentRequest request = SettleInstallmentRequest.builder().build();

        ReceivableInstallmentResponse response = receivableService.settle(userId, installmentId, request);

        assertEquals(new BigDecimal("100.00"), response.getReceivedAmount());
        assertEquals(new BigDecimal("0.00"), response.getRemainingAmount());
        assertEquals(InstallmentStatus.RECEIVED, response.getStatus());
        assertEquals(ReceivableStatus.RECEIVED, receivable.getStatus());
    }

    @Test
    @DisplayName("Rejeita valor de baixa maior que o saldo em aberto")
    void shouldRejectSettleAmountExceedingRemaining() {
        UUID installmentId = UUID.randomUUID();
        ReceivableInstallment installment = ReceivableInstallment.builder()
                .id(installmentId)
                .netAmount(new BigDecimal("100.00"))
                .receivedAmount(new BigDecimal("80.00"))
                .status(InstallmentStatus.PARTIAL)
                .build();

        when(installmentRepository.findByIdAndUserId(installmentId, userId)).thenReturn(Optional.of(installment));

        SettleInstallmentRequest request = SettleInstallmentRequest.builder()
                .amount(new BigDecimal("30.00"))
                .build();

        InvalidRequestException ex = assertThrows(InvalidRequestException.class,
                () -> receivableService.settle(userId, installmentId, request));
        assertTrue(ex.getMessage().contains("não pode exceder o saldo restante"));
    }

    @Test
    @DisplayName("Estorna baixa zerando valor recebido e registrando motivo")
    void shouldReverseSettlement() {
        UUID installmentId = UUID.randomUUID();
        Receivable receivable = Receivable.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .status(ReceivableStatus.RECEIVED)
                .build();

        ReceivableInstallment installment = ReceivableInstallment.builder()
                .id(installmentId)
                .receivable(receivable)
                .installmentNumber(1)
                .totalInstallments(1)
                .grossAmount(new BigDecimal("100.00"))
                .netAmount(new BigDecimal("100.00"))
                .receivedAmount(new BigDecimal("100.00"))
                .status(InstallmentStatus.RECEIVED)
                .dueDate(LocalDate.now().plusDays(10))
                .build();

        receivable.setInstallmentList(new ArrayList<>(List.of(installment)));

        when(installmentRepository.findByIdAndUserId(installmentId, userId)).thenReturn(Optional.of(installment));
        when(installmentRepository.save(any(ReceivableInstallment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        ReverseInstallmentRequest request = ReverseInstallmentRequest.builder()
                .reason("Cliente solicitou cancelamento do PIX")
                .build();

        ReceivableInstallmentResponse response = receivableService.reverse(userId, installmentId, request);

        assertEquals(new BigDecimal("0.00"), response.getReceivedAmount());
        assertEquals(InstallmentStatus.PENDING, response.getStatus());
        assertEquals("Cliente solicitou cancelamento do PIX", response.getReversalReason());
        assertEquals(ReceivableStatus.PENDING, receivable.getStatus());
    }

    @Test
    @DisplayName("Identifica automaticamente parcela vencida como atrasada (OVERDUE)")
    void shouldIdentifyOverdueInstallment() {
        Receivable receivable = Receivable.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .build();

        ReceivableInstallment installment = ReceivableInstallment.builder()
                .id(UUID.randomUUID())
                .receivable(receivable)
                .installmentNumber(1)
                .totalInstallments(1)
                .grossAmount(new BigDecimal("50.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("50.00"))
                .receivedAmount(BigDecimal.ZERO)
                .status(InstallmentStatus.PENDING)
                .dueDate(LocalDate.now().minusDays(5)) // Vencida há 5 dias
                .build();

        receivable.setInstallmentList(List.of(installment));

        assertTrue(installment.isOverdue());
        assertEquals(InstallmentStatus.OVERDUE, installment.getEffectiveStatus());
        assertEquals(ReceivableStatus.OVERDUE, receivable.getEffectiveStatus());

        ReceivableInstallmentResponse resp = receivableService.toInstallmentResponse(installment);
        assertTrue(resp.getOverdue());
        assertEquals(InstallmentStatus.OVERDUE, resp.getStatus());
    }

    @Test
    @DisplayName("Garante isolamento: não encontra parcela pertencente a outro usuário")
    void shouldEnforceUserIsolation() {
        UUID installmentId = UUID.randomUUID();
        when(installmentRepository.findByIdAndUserId(installmentId, userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> receivableService.settle(userId, installmentId, SettleInstallmentRequest.builder().build()));
    }

    @Test
    @DisplayName("Divide R$ 0,06 em 12x sem parcela negativa e sem ultrapassar o total")
    void shouldSplitSmallAmountWithoutNegativeInstallments() {
        List<BigDecimal> parts = ReceivableService.splitCents(new BigDecimal("0.06"), 12);

        assertEquals(12, parts.size());
        assertTrue(parts.stream().allMatch(part -> part.signum() >= 0));
        assertEquals(new BigDecimal("0.00"), parts.get(0));
        assertEquals(new BigDecimal("0.01"), parts.get(11));
        assertEquals(new BigDecimal("0.06"), parts.stream().reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    @Test
    @DisplayName("Ignora configuração inativa no prazo de liquidação e usa o prazo recomendado")
    void shouldIgnoreInactiveConfigForSettlementDays() {
        Sale sale = Sale.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .description("Venda no crédito")
                .grossAmount(new BigDecimal("80.00"))
                .feeAmount(new BigDecimal("2.56"))
                .netAmount(new BigDecimal("77.44"))
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .soldAt(LocalDateTime.of(2026, 4, 1, 10, 0))
                .build();

        when(receivableRepository.findBySaleIdAndUserId(sale.getId(), userId)).thenReturn(Optional.empty());
        when(paymentMethodConfigService.resolveConfig(eq(userId), eq(PaymentMethod.CREDITO_A_VISTA), eq(1)))
                .thenReturn(Optional.of(PaymentMethodConfig.builder().settlementDays(90).isActive(false).build()));
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        Receivable receivable = receivableService.createFromSale(sale);

        assertEquals(LocalDate.of(2026, 5, 1), receivable.getInstallmentList().get(0).getDueDate());
    }

    @Test
    @DisplayName("Gera novamente as parcelas quando a venda sem recebimentos muda de valor e parcelas")
    void shouldRegenerateInstallmentsWhenSaleChangesWithoutReceipts() {
        Receivable receivable = receivableForSale(new BigDecimal("0.00"));
        Sale sale = receivable.getSale();
        sale.setGrossAmount(new BigDecimal("90.00"));
        sale.setFeeAmount(new BigDecimal("4.50"));
        sale.setNetAmount(new BigDecimal("85.50"));
        sale.setPaymentMethod(PaymentMethod.CREDITO_PARCELADO);
        sale.setInstallments(3);
        sale.setSoldAt(LocalDateTime.of(2026, 6, 10, 9, 0));

        when(receivableRepository.findBySaleIdAndUserId(sale.getId(), userId)).thenReturn(Optional.of(receivable));
        when(paymentMethodConfigService.resolveConfig(eq(userId), eq(PaymentMethod.CREDITO_PARCELADO), eq(3)))
                .thenReturn(Optional.empty());
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        Receivable synced = receivableService.syncFromSale(sale);

        List<ReceivableInstallment> installments = synced.getInstallmentList();
        assertAll(
                () -> assertEquals(new BigDecimal("85.50"), synced.getNetAmount()),
                () -> assertEquals(PaymentMethod.CREDITO_PARCELADO, synced.getPaymentMethod()),
                () -> assertEquals(3, installments.size()),
                () -> assertEquals(new BigDecimal("28.50"), installments.get(2).getNetAmount()),
                () -> assertEquals(new BigDecimal("1.50"), installments.get(0).getFeeAmount()),
                () -> assertEquals(LocalDate.of(2026, 7, 10), installments.get(0).getDueDate())
        );
    }

    @Test
    @DisplayName("Bloqueia alteração de valor da venda quando o título já tem recebimentos")
    void shouldBlockFinancialChangeWhenReceivableHasReceipts() {
        Receivable receivable = receivableForSale(new BigDecimal("20.00"));
        Sale sale = receivable.getSale();
        sale.setGrossAmount(new BigDecimal("90.00"));
        sale.setNetAmount(new BigDecimal("90.00"));

        when(receivableRepository.findBySaleIdAndUserId(sale.getId(), userId)).thenReturn(Optional.of(receivable));

        assertThrows(InvalidRequestException.class, () -> receivableService.syncFromSale(sale));
        assertEquals(new BigDecimal("50.00"), receivable.getInstallmentList().get(0).getNetAmount());
        verify(receivableRepository, never()).save(any(Receivable.class));
    }

    @Test
    @DisplayName("Atualiza só a descrição do título quando a venda com recebimentos não muda valores")
    void shouldUpdateDescriptionOnlyWhenSaleWithReceiptsKeepsTerms() {
        Receivable receivable = receivableForSale(new BigDecimal("20.00"));
        Sale sale = receivable.getSale();
        sale.setDescription("Bolo de cenoura");

        when(receivableRepository.findBySaleIdAndUserId(sale.getId(), userId)).thenReturn(Optional.of(receivable));
        when(receivableRepository.save(any(Receivable.class))).thenAnswer(inv -> inv.getArgument(0));

        Receivable synced = receivableService.syncFromSale(sale);

        assertEquals("Bolo de cenoura", synced.getDescription());
        assertEquals(new BigDecimal("20.00"), synced.getInstallmentList().get(0).getReceivedAmount());
        assertEquals(2, synced.getInstallmentList().size());
    }

    private Receivable receivableForSale(BigDecimal firstReceived) {
        Sale sale = Sale.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .description("Bolo de chocolate")
                .grossAmount(new BigDecimal("100.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .paymentMethod(PaymentMethod.CREDITO_PARCELADO)
                .installments(2)
                .soldAt(LocalDateTime.of(2026, 4, 1, 10, 0))
                .build();
        Receivable receivable = Receivable.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .sale(sale)
                .description(sale.getDescription())
                .grossAmount(new BigDecimal("100.00"))
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .paymentMethod(PaymentMethod.CREDITO_PARCELADO)
                .installments(2)
                .issuedAt(LocalDate.of(2026, 4, 1))
                .build();
        for (int i = 1; i <= 2; i++) {
            receivable.getInstallmentList().add(ReceivableInstallment.builder()
                    .receivable(receivable)
                    .installmentNumber(i)
                    .totalInstallments(2)
                    .dueDate(LocalDate.of(2026, 4, 1).plusDays(30L * i))
                    .grossAmount(new BigDecimal("50.00"))
                    .feeAmount(BigDecimal.ZERO)
                    .netAmount(new BigDecimal("50.00"))
                    .receivedAmount(i == 1 ? firstReceived : BigDecimal.ZERO)
                    .status(InstallmentStatus.PENDING)
                    .build());
        }
        return receivable;
    }
}
