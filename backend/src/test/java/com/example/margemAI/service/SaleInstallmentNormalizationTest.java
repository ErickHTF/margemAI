package com.example.margemAI.service;

import com.example.margemAI.dto.request.SaleRequest;
import com.example.margemAI.dto.response.SaleResponse;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Parcelas da venda em crédito parcelado")
class SaleInstallmentNormalizationTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private PaymentFeeCalculator paymentFeeCalculator = new PaymentFeeCalculator();

    @InjectMocks
    private SaleService saleService;

    @ParameterizedTest(name = "{0} parcela(s) informada(s) → registrada como {1}x com taxa {2}%")
    @CsvSource(value = {
            "1, 2, 5.50, 4.40, 75.60",
            "NULL, 2, 5.50, 4.40, 75.60",
            "6, 6, 9.50, 7.60, 72.40"
    }, nullValues = "NULL")
    @DisplayName("Registra e cobra crédito parcelado com no mínimo 2 parcelas, como a matriz e a prévia da venda")
    void shouldRecordInstallmentCreditWithAtLeastTwoInstallments(
            Integer requestedInstallments,
            int expectedInstallments,
            String expectedFeePercent,
            String expectedFeeAmount,
            String expectedNetAmount
    ) {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.of(User.builder().id(userId).build()));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SaleRequest request = SaleRequest.builder()
                .description("Venda parcelada")
                .quantity(new BigDecimal("1"))
                .unitPrice(new BigDecimal("80.00"))
                .paymentMethod(PaymentMethod.CREDITO_PARCELADO)
                .installments(requestedInstallments)
                .build();

        SaleResponse response = saleService.create(userId, request);

        ArgumentCaptor<Sale> saved = ArgumentCaptor.forClass(Sale.class);
        verify(saleRepository).save(saved.capture());
        assertAll(
                () -> assertEquals(expectedInstallments, saved.getValue().getInstallments()),
                () -> assertEquals(0, new BigDecimal(expectedFeePercent).compareTo(saved.getValue().getFeePercentage())),
                () -> assertEquals(0, new BigDecimal(expectedFeeAmount).compareTo(response.getFeeAmount())),
                () -> assertEquals(0, new BigDecimal(expectedNetAmount).compareTo(response.getNetAmount()))
        );
    }
}
