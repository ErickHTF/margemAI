package com.example.margemAI.controller;

import com.example.margemAI.dto.request.SaleRequest;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SaleRepository;
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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class SaleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SegmentRepository segmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User savedUser;
    private User otherUser;
    private String accessToken;
    private String otherAccessToken;
    private Product userProduct;

    @BeforeEach
    void setUp() {
        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("COMERCIO")
                        .name("Comércio Varejista")
                        .active(true)
                        .build()));

        savedUser = userRepository.save(User.builder()
                .name("Empreendedor Vendas")
                .email("vendas@empresa.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("11222333000181")
                .segment(segment)
                .build());

        otherUser = userRepository.save(User.builder()
                .name("Outro Empreendedor")
                .email("outro@empresa.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("99888777000166")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
        otherAccessToken = jwtService.generateAccessToken(otherUser);

        userProduct = productRepository.save(Product.builder()
                .name("Açaí 500ml")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("8.00"))
                .sellingPrice(new BigDecimal("18.00"))
                .active(true)
                .user(savedUser)
                .build());
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    @Test
    @DisplayName("POST /sales - Deve registrar venda com produto do catálogo e calcular taxa de débito")
    void shouldCreateSaleWithCatalogProduct() throws Exception {
        SaleRequest request = SaleRequest.builder()
                .productId(userProduct.getId())
                .quantity(new BigDecimal("2.00"))
                .paymentMethod(PaymentMethod.DEBITO)
                .build();

        mockMvc.perform(post("/sales")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.productId").value(userProduct.getId().toString()))
                .andExpect(jsonPath("$.productName").value("Açaí 500ml"))
                .andExpect(jsonPath("$.quantity").value(2.00))
                .andExpect(jsonPath("$.unitPrice").value(18.00))
                .andExpect(jsonPath("$.grossAmount").value(36.00))
                .andExpect(jsonPath("$.paymentMethod").value("DEBITO"))
                .andExpect(jsonPath("$.feePercentage").value(1.50))
                .andExpect(jsonPath("$.feeAmount").value(0.54))
                .andExpect(jsonPath("$.netAmount").value(35.46));
    }

    @Test
    @DisplayName("POST /sales - Deve registrar venda avulsa em Pix com taxa 0%")
    void shouldCreateCustomSaleWithPix() throws Exception {
        SaleRequest request = SaleRequest.builder()
                .description("Serviço de Entrega Expressa")
                .quantity(new BigDecimal("1.00"))
                .unitPrice(new BigDecimal("25.00"))
                .paymentMethod(PaymentMethod.PIX)
                .build();

        mockMvc.perform(post("/sales")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.description").value("Serviço de Entrega Expressa"))
                .andExpect(jsonPath("$.grossAmount").value(25.00))
                .andExpect(jsonPath("$.feeAmount").value(0.00))
                .andExpect(jsonPath("$.netAmount").value(25.00));
    }

    @Test
    @DisplayName("POST /sales - Deve falhar com 404 se tentar vender produto de outro usuário (Multi-tenant IDOR)")
    void shouldFailWhenProductBelongsToAnotherUser() throws Exception {
        Product foreignProduct = productRepository.save(Product.builder()
                .name("Produto Alheio")
                .type(ItemType.PRODUTO)
                .sellingPrice(new BigDecimal("50.00"))
                .active(true)
                .user(otherUser)
                .build());

        SaleRequest request = SaleRequest.builder()
                .productId(foreignProduct.getId())
                .quantity(new BigDecimal("1.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .build();

        mockMvc.perform(post("/sales")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /sales - Deve retornar sumário financeiro e lista de vendas paginada")
    void shouldReturnSalesSummaryAndPaginatedList() throws Exception {
        // Criar duas vendas para o usuário
        Sale sale1 = Sale.builder()
                .user(savedUser)
                .product(userProduct)
                .description("Açaí 500ml")
                .quantity(new BigDecimal("2.00"))
                .unitPrice(new BigDecimal("20.00"))
                .grossAmount(new BigDecimal("40.00"))
                .paymentMethod(PaymentMethod.PIX)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("40.00"))
                .soldAt(LocalDateTime.now())
                .build();

        Sale sale2 = Sale.builder()
                .user(savedUser)
                .product(userProduct)
                .description("Açaí 500ml")
                .quantity(new BigDecimal("1.00"))
                .unitPrice(new BigDecimal("20.00"))
                .grossAmount(new BigDecimal("20.00"))
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .feePercentage(new BigDecimal("3.20"))
                .feeAmount(new BigDecimal("0.64"))
                .netAmount(new BigDecimal("19.36"))
                .soldAt(LocalDateTime.now())
                .build();

        saleRepository.save(sale1);
        saleRepository.save(sale2);

        mockMvc.perform(get("/sales")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalGrossRevenue").value(60.00))
                .andExpect(jsonPath("$.totalFeeAmount").value(0.64))
                .andExpect(jsonPath("$.totalNetRevenue").value(59.36))
                .andExpect(jsonPath("$.totalSalesCount").value(2))
                .andExpect(jsonPath("$.sales.content", hasSize(2)));
    }

    @Test
    @DisplayName("GET /sales/{id} - Não deve permitir acesso a venda de outro usuário")
    void shouldNotAllowAccessToOtherUserSale() throws Exception {
        Sale foreignSale = saleRepository.save(Sale.builder()
                .user(otherUser)
                .description("Venda do Outro")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("10.00"))
                .grossAmount(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00"))
                .soldAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/sales/" + foreignSale.getId())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /sales/{id} - Deve excluir venda existente do usuário autenticado")
    void shouldDeleteSaleSuccessfully() throws Exception {
        Sale sale = saleRepository.save(Sale.builder()
                .user(savedUser)
                .description("Venda Cancelada")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("15.00"))
                .grossAmount(new BigDecimal("15.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("15.00"))
                .soldAt(LocalDateTime.now())
                .build());

        mockMvc.perform(delete("/sales/" + sale.getId())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        assertFalse(saleRepository.existsById(sale.getId()));
    }

    @Test
    @DisplayName("PUT /sales/{id} - Deve atualizar venda existente com sucesso")
    void shouldUpdateSaleSuccessfully() throws Exception {
        Sale sale = saleRepository.save(Sale.builder()
                .user(savedUser)
                .product(userProduct)
                .description("Açaí 500ml")
                .quantity(new BigDecimal("1.00"))
                .unitPrice(new BigDecimal("18.00"))
                .grossAmount(new BigDecimal("18.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("18.00"))
                .soldAt(LocalDateTime.now())
                .build());

        SaleRequest updateRequest = SaleRequest.builder()
                .productId(userProduct.getId())
                .quantity(new BigDecimal("3.00"))
                .unitPrice(new BigDecimal("20.00"))
                .paymentMethod(PaymentMethod.CREDITO_A_VISTA)
                .build();

        mockMvc.perform(put("/sales/" + sale.getId())
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(sale.getId().toString()))
                .andExpect(jsonPath("$.quantity").value(3.00))
                .andExpect(jsonPath("$.unitPrice").value(20.00))
                .andExpect(jsonPath("$.grossAmount").value(60.00))
                .andExpect(jsonPath("$.paymentMethod").value("CREDITO_A_VISTA"))
                .andExpect(jsonPath("$.feePercentage").value(3.20))
                .andExpect(jsonPath("$.feeAmount").value(1.92))
                .andExpect(jsonPath("$.netAmount").value(58.08));
    }

    @Test
    @DisplayName("PUT /sales/{id} - Deve retornar 404 ao tentar atualizar venda de outro usuário")
    void shouldReturn404WhenUpdatingOtherUserSale() throws Exception {
        Sale otherSale = saleRepository.save(Sale.builder()
                .user(otherUser)
                .description("Venda Outro")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("10.00"))
                .grossAmount(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00"))
                .soldAt(LocalDateTime.now())
                .build());

        SaleRequest updateRequest = SaleRequest.builder()
                .description("Tentativa Hacker")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("20.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .build();

        mockMvc.perform(put("/sales/" + otherSale.getId())
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /sales?productId={id} - Deve filtrar vendas pelo produto especificado")
    void shouldFilterSalesByProductId() throws Exception {
        Product anotherProduct = productRepository.save(Product.builder()
                .name("Suco Natural")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("3.00"))
                .sellingPrice(new BigDecimal("10.00"))
                .active(true)
                .user(savedUser)
                .build());

        saleRepository.save(Sale.builder()
                .user(savedUser)
                .product(userProduct)
                .description("Açaí 500ml")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("18.00"))
                .grossAmount(new BigDecimal("18.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("18.00"))
                .soldAt(LocalDateTime.now())
                .build());

        saleRepository.save(Sale.builder()
                .user(savedUser)
                .product(anotherProduct)
                .description("Suco Natural")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("10.00"))
                .grossAmount(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(BigDecimal.ZERO)
                .netAmount(new BigDecimal("10.00"))
                .soldAt(LocalDateTime.now())
                .build());

        mockMvc.perform(get("/sales")
                        .param("productId", anotherProduct.getId().toString())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSalesCount").value(1))
                .andExpect(jsonPath("$.totalGrossRevenue").value(10.00))
                .andExpect(jsonPath("$.sales.content[0].productName").value("Suco Natural"));
    }

    @Test
    @DisplayName("POST /sales - Deve aceitar payload OpenAPI usando unitAmount e saleDate")
    void shouldAcceptOpenApiAliasedPayload() throws Exception {
        String jsonPayload = """
                {
                    "productId": "%s",
                    "quantity": 2,
                    "unitAmount": 18.00,
                    "paymentMethod": "PIX",
                    "saleDate": "2026-06-15T14:30:00"
                }
                """.formatted(userProduct.getId());

        mockMvc.perform(post("/sales")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.grossAmount").value(36.00))
                .andExpect(jsonPath("$.unitPrice").value(18.00))
                .andExpect(jsonPath("$.paymentMethod").value("PIX"));
    }

    @Test
    @DisplayName("POST /sales - Deve retornar 401 se não enviar token de autenticação")
    void shouldReturn401WhenUnauthenticated() throws Exception {
        SaleRequest request = SaleRequest.builder()
                .description("Tentativa não autorizada")
                .quantity(BigDecimal.ONE)
                .unitPrice(new BigDecimal("10.00"))
                .paymentMethod(PaymentMethod.DINHEIRO)
                .build();

        mockMvc.perform(post("/sales")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
