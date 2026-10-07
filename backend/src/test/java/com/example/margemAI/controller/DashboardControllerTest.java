package com.example.margemAI.controller;

import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.repository.VariableCostRepository;
import com.example.margemAI.security.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private FixedCostRepository fixedCostRepository;

    @Autowired
    private VariableCostRepository variableCostRepository;

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
                .name("Empreendedor Fluxo")
                .email("fluxo@empresa.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("11222333000181")
                .segment(segment)
                .build());

        otherUser = userRepository.save(User.builder()
                .name("Outro Empreendedor")
                .email("outro.fluxo@empresa.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("99888777000166")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);

        userProduct = productRepository.save(Product.builder()
                .name("Açaí 500ml")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("8.00"))
                .sellingPrice(new BigDecimal("18.00"))
                .active(true)
                .user(savedUser)
                .build());

        variableCostRepository.save(VariableCost.builder()
                .name("Embalagem")
                .unitAmount(new BigDecimal("3.00"))
                .category(VariableCostCategory.EMBALAGEM)
                .productId(userProduct.getId())
                .active(true)
                .user(savedUser)
                .build());

        fixedCostRepository.save(FixedCost.builder()
                .name("Aluguel")
                .amount(new BigDecimal("500.00"))
                .category(FixedCostCategory.ALUGUEL)
                .recurring(true)
                .active(true)
                .user(savedUser)
                .build());
    }

    private Sale sale(User owner, Product product, String quantity, String gross, String fee, LocalDateTime soldAt) {
        BigDecimal grossAmount = new BigDecimal(gross);
        BigDecimal feeAmount = new BigDecimal(fee);
        return saleRepository.save(Sale.builder()
                .user(owner)
                .product(product)
                .description("Venda")
                .quantity(new BigDecimal(quantity))
                .unitPrice(grossAmount)
                .grossAmount(grossAmount)
                .paymentMethod(PaymentMethod.PIX)
                .feePercentage(BigDecimal.ZERO)
                .feeAmount(feeAmount)
                .netAmount(grossAmount.subtract(feeAmount))
                .soldAt(soldAt)
                .build());
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    @Test
    @DisplayName("GET /dashboard/monthly-flow - Deve retornar evolução mensal de receitas e despesas do usuário")
    void shouldReturnMonthlyFlowForAuthenticatedUser() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        sale(savedUser, userProduct, "2", "36.00", "1.00", now);
        sale(savedUser, null, "1", "100.00", "0.00", now.minusMonths(2));
        sale(otherUser, null, "1", "999.00", "0.00", now);

        String currentMonth = YearMonth.now().toString();
        String twoMonthsAgo = YearMonth.now().minusMonths(2).toString();

        mockMvc.perform(get("/dashboard/monthly-flow")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endMonth").value(currentMonth))
                .andExpect(jsonPath("$.months", hasSize(6)))
                .andExpect(jsonPath("$.months[5].month").value(currentMonth))
                .andExpect(jsonPath("$.months[5].revenue").value(36.00))
                .andExpect(jsonPath("$.months[5].salesCount").value(1))
                .andExpect(jsonPath("$.months[5].variableCosts").value(6.00))
                .andExpect(jsonPath("$.months[5].paymentFees").value(1.00))
                .andExpect(jsonPath("$.months[5].fixedCosts").value(500.00))
                .andExpect(jsonPath("$.months[5].balance").value(-471.00))
                .andExpect(jsonPath("$.months[3].month").value(twoMonthsAgo))
                .andExpect(jsonPath("$.months[3].revenue").value(100.00))
                .andExpect(jsonPath("$.months[3].fixedCosts").value(0.00))
                .andExpect(jsonPath("$.totalRevenue").value(136.00))
                .andExpect(jsonPath("$.totalExpenses").value(507.00))
                .andExpect(jsonPath("$.bestMonth").value(twoMonthsAgo))
                .andExpect(jsonPath("$.worstMonth").value(currentMonth));
    }

    @Test
    @DisplayName("GET /v1/dashboard/monthly-flow - Deve aceitar período de 12 meses com mês final informado")
    void shouldAcceptTwelveMonthsWithEndMonth() throws Exception {
        mockMvc.perform(get("/v1/dashboard/monthly-flow")
                        .param("months", "12")
                        .param("endMonth", "2026-06")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startMonth").value("2025-07"))
                .andExpect(jsonPath("$.endMonth").value("2026-06"))
                .andExpect(jsonPath("$.months", hasSize(12)));
    }

    @Test
    @DisplayName("GET /dashboard/monthly-flow - Deve retornar 400 para período fora da faixa")
    void shouldReturnBadRequestForInvalidPeriod() throws Exception {
        mockMvc.perform(get("/dashboard/monthly-flow")
                        .param("months", "3")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("GET /dashboard/monthly-flow - Deve retornar 400 para mês final inválido")
    void shouldReturnBadRequestForInvalidEndMonth() throws Exception {
        mockMvc.perform(get("/dashboard/monthly-flow")
                        .param("endMonth", "2026-13")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("GET /dashboard/monthly-flow - Deve retornar 401 sem token")
    void shouldReturnUnauthorizedWithoutToken() throws Exception {
        mockMvc.perform(get("/dashboard/monthly-flow"))
                .andExpect(status().isUnauthorized());
    }
}
