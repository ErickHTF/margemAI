package com.example.margemAI.service;

import com.example.margemAI.dto.request.SaleRequest;
import com.example.margemAI.dto.response.SaleResponse;
import com.example.margemAI.dto.response.SaleSummaryResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SaleServiceTest {

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private UserRepository userRepository;

    @Spy
    private PaymentFeeCalculator paymentFeeCalculator = new PaymentFeeCalculator();

    @InjectMocks
    private SaleService saleService;

    private User testUser;
    private Product testProduct;
    private UUID userId;
    private UUID productId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        productId = UUID.randomUUID();

        testUser = User.builder()
                .id(userId)
                .name("Empreendedor Teste")
                .email("teste@margem.ai")
                .build();

        testProduct = Product.builder()
                .id(productId)
                .user(testUser)
                .name("Consultoria MEI")
                .type(ItemType.SERVICO)
                .sellingPrice(new BigDecimal("150.00"))
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Deve registrar venda vinculada a um produto do catálogo com sucesso")
    void shouldCreateSaleWithProductSuccessfully() {
        // Arrange
        SaleRequest request = SaleRequest.builder()
                .productId(productId)
                .quantity(new BigDecimal("2.00"))
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .installments(1)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(productRepository.findByIdAndUserId(productId, userId)).thenReturn(Optional.of(testProduct));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale s = invocation.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        // Act
        SaleResponse response = saleService.create(userId, request);

        // Assert
        assertNotNull(response);
        assertEquals(productId, response.getProductId());
        assertEquals("Consultoria MEI", response.getProductName());
        assertEquals(new BigDecimal("300.00"), response.getGrossAmount());
        assertEquals(new BigDecimal("3.20"), response.getFeePercentage());
        assertEquals(new BigDecimal("9.60"), response.getFeeAmount());
        assertEquals(new BigDecimal("290.40"), response.getNetAmount());
        verify(saleRepository).save(any(Sale.class));
    }

    @Test
    @DisplayName("Deve registrar venda avulsa sem produto vinculado com sucesso")
    void shouldCreateSaleWithoutProductSuccessfully() {
        // Arrange
        SaleRequest request = SaleRequest.builder()
                .description("Venda Rápida de Balcão")
                .quantity(new BigDecimal("1.00"))
                .unitPrice(new BigDecimal("50.00"))
                .paymentMethod(PaymentMethod.PIX)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> {
            Sale s = invocation.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        // Act
        SaleResponse response = saleService.create(userId, request);

        // Assert
        assertNotNull(response);
        assertEquals("Venda Rápida de Balcão", response.getDescription());
        assertEquals(new BigDecimal("50.00"), response.getGrossAmount());
        assertEquals(new BigDecimal("0.00"), response.getFeeAmount());
        assertEquals(new BigDecimal("50.00"), response.getNetAmount());
    }

    @Test
    @DisplayName("Deve falhar ao tentar registrar venda para produto inexistente ou de outro usuário")
    void shouldThrowWhenProductNotFound() {
        // Arrange
        SaleRequest request = SaleRequest.builder()
                .productId(productId)
                .quantity(new BigDecimal("1.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
        when(productRepository.findByIdAndUserId(productId, userId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> saleService.create(userId, request));
    }

    @Test
    @DisplayName("Deve falhar se nem produto nem descrição forem fornecidos")
    void shouldThrowWhenNoProductAndNoDescriptionProvided() {
        // Arrange
        SaleRequest request = SaleRequest.builder()
                .quantity(new BigDecimal("1.00"))
                .unitPrice(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        // Act & Assert
        assertThrows(InvalidRequestException.class, () -> saleService.create(userId, request));
    }

    @Test
    @DisplayName("Deve listar vendas com consolidação financeira dos totais")
    void shouldFindAllSalesWithSummaryTotals() {
        // Arrange
        Sale sale1 = Sale.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .description("Venda 1")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("100.00"))
                .grossAmount(new BigDecimal("100.00"))
                .paymentMethod(PaymentMethod.PIX)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("100.00"))
                .soldAt(LocalDateTime.now())
                .build();

        Sale sale2 = Sale.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .description("Venda 2")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("100.00"))
                .grossAmount(new BigDecimal("100.00"))
                .paymentMethod(PaymentMethod.DEBITO)
                .feePercentage(new BigDecimal("1.50"))
                .feeAmount(new BigDecimal("1.50"))
                .netAmount(new BigDecimal("98.50"))
                .soldAt(LocalDateTime.now())
                .build();

        List<Sale> sales = List.of(sale1, sale2);
        Page<Sale> page = new PageImpl<>(sales);

        when(saleRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(saleRepository.findAll(any(Specification.class))).thenReturn(sales);

        // Act
        SaleSummaryResponse summary = saleService.findAll(userId, null, null, null, null, 0, 20);

        // Assert
        assertNotNull(summary);
        assertEquals(2L, summary.getTotalSalesCount());
        assertEquals(new BigDecimal("200.00"), summary.getTotalGrossRevenue());
        assertEquals(new BigDecimal("1.50"), summary.getTotalFeeAmount());
        assertEquals(new BigDecimal("198.50"), summary.getTotalNetRevenue());
        assertEquals(2, summary.getSales().getContent().size());
    }

    @Test
    @DisplayName("Deve atualizar venda existente com recálculo automático de taxas")
    void shouldUpdateSaleSuccessfully() {
        // Arrange
        UUID saleId = UUID.randomUUID();
        Sale existingSale = Sale.builder()
                .id(saleId)
                .user(testUser)
                .product(testProduct)
                .description("Consultoria MEI")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("150.00"))
                .grossAmount(new BigDecimal("150.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("150.00"))
                .soldAt(LocalDateTime.now())
                .build();

        SaleRequest updateRequest = SaleRequest.builder()
                .productId(productId)
                .quantity(new BigDecimal("2.00"))
                .unitPrice(new BigDecimal("200.00"))
                .paymentMethod(PaymentMethod.DEBITO)
                .build();

        when(saleRepository.findByIdAndUserId(saleId, userId)).thenReturn(Optional.of(existingSale));
        when(productRepository.findByIdAndUserId(productId, userId)).thenReturn(Optional.of(testProduct));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        SaleResponse response = saleService.update(userId, saleId, updateRequest);

        // Assert
        assertNotNull(response);
        assertEquals(new BigDecimal("400.00"), response.getGrossAmount());
        assertEquals(PaymentMethod.DEBITO, response.getPaymentMethod());
        assertEquals(new BigDecimal("1.50"), response.getFeePercentage());
        assertEquals(new BigDecimal("6.00"), response.getFeeAmount());
        assertEquals(new BigDecimal("394.00"), response.getNetAmount());
        verify(saleRepository).save(existingSale);
    }

    @Test
    @DisplayName("Deve excluir venda existente pertencente ao usuário")
    void shouldDeleteSaleSuccessfully() {
        // Arrange
        UUID saleId = UUID.randomUUID();
        Sale sale = Sale.builder().id(saleId).user(testUser).build();
        when(saleRepository.findByIdAndUserId(saleId, userId)).thenReturn(Optional.of(sale));

        // Act
        saleService.delete(userId, saleId);

        // Assert
        verify(saleRepository).delete(sale);
    }
}
