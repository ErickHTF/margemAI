package com.example.margemAI.controller;

import com.example.margemAI.dto.request.ProductRequest;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.repository.VariableCostRepository;
import com.example.margemAI.security.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

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
    private String accessToken;

    @BeforeEach
    void setUp() {
        Segment segment = segmentRepository.findByCodeIgnoreCase("COMERCIO")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("COMERCIO")
                        .name("Comércio Varejista e Atacadista")
                        .active(true)
                        .build()));

        savedUser = userRepository.save(User.builder()
                .name("Maria Silva")
                .email("maria.product@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("12ABC345000199")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    private UUID createProduct(String name, ItemType type, String baseCost, String sellingPrice) {
        return productRepository.save(Product.builder()
                .name(name)
                .type(type)
                .baseCost(new BigDecimal(baseCost))
                .sellingPrice(new BigDecimal(sellingPrice))
                .active(true)
                .user(savedUser)
                .build()).getId();
    }

    private UUID createVariableCost(UUID productId, String name, String unitAmount) {
        return variableCostRepository.save(VariableCost.builder()
                .name(name)
                .unitAmount(new BigDecimal(unitAmount))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .productId(productId)
                .active(true)
                .user(savedUser)
                .build()).getId();
    }

    private User createOtherUser(String name, String email, String cnpj) {
        Segment segment = segmentRepository.findByCodeIgnoreCase("SERVICOS")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("SERVICOS")
                        .name("Prestação de Serviços")
                        .active(true)
                        .build()));
        return userRepository.save(User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj(cnpj)
                .segment(segment)
                .build());
    }

    private String tokenFor(User user) {
        return "Bearer " + jwtService.generateAccessToken(user);
    }

    @Test
    void shouldReturn401WhenListingWithoutToken() throws Exception {
        mockMvc.perform(get("/v1/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldCreateProductAndReturn201() throws Exception {
        ProductRequest request = ProductRequest.builder()
                .name("Camiseta Algodão")
                .description("Cores variadas")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("18.00"))
                .sellingPrice(new BigDecimal("49.90"))
                .build();

        mockMvc.perform(post("/v1/products")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Camiseta Algodão"))
                .andExpect(jsonPath("$.type").value("PRODUTO"))
                .andExpect(jsonPath("$.baseCost").value(18.00))
                .andExpect(jsonPath("$.sellingPrice").value(49.90))
                .andExpect(jsonPath("$.id").exists());

        assertEquals(1, productRepository.count());
    }

    @Test
    void shouldReturn400WhenCreatingWithoutRequiredFields() throws Exception {
        ProductRequest request = ProductRequest.builder()
                .name("")
                .type(null)
                .build();

        mockMvc.perform(post("/v1/products")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldListProductsPaginated() throws Exception {
        createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");
        createProduct("Calça Jeans", ItemType.PRODUTO, "40.00", "99.90");
        createProduct("Ajuste de Bainha", ItemType.SERVICO, "5.00", "25.00");

        mockMvc.perform(get("/v1/products")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void shouldListProductsFilteredByType() throws Exception {
        createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");
        createProduct("Ajuste de Bainha", ItemType.SERVICO, "5.00", "25.00");

        mockMvc.perform(get("/v1/products")
                        .header("Authorization", bearerHeader())
                        .param("type", "SERVICO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Ajuste de Bainha"));
    }

    @Test
    void shouldListProductsFilteredBySearch() throws Exception {
        createProduct("Camiseta Básica", ItemType.PRODUTO, "20.00", "50.00");
        createProduct("Bermuda Cargo", ItemType.PRODUTO, "30.00", "70.00");

        mockMvc.perform(get("/v1/products")
                        .header("Authorization", bearerHeader())
                        .param("search", "Básica"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Camiseta Básica"));
    }

    @Test
    void shouldReturnProductById() throws Exception {
        UUID id = createProduct("Consultoria", ItemType.SERVICO, "0.00", "150.00");

        mockMvc.perform(get("/v1/products/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Consultoria"))
                .andExpect(jsonPath("$.sellingPrice").value(150.00));
    }

    @Test
    void shouldReturn404WhenProductNotFound() throws Exception {
        mockMvc.perform(get("/v1/products/{id}", UUID.randomUUID())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldFullyUpdateProductWithPut() throws Exception {
        UUID id = createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");

        ProductRequest request = ProductRequest.builder()
                .name("Camiseta Premium")
                .description("Algodão Pima")
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal("25.00"))
                .sellingPrice(new BigDecimal("65.00"))
                .build();

        mockMvc.perform(put("/v1/products/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Camiseta Premium"))
                .andExpect(jsonPath("$.sellingPrice").value(65.00));
    }

    @Test
    void shouldPatchProductSellingPrice() throws Exception {
        UUID id = createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");

        ProductRequest request = ProductRequest.builder()
                .sellingPrice(new BigDecimal("59.90"))
                .build();

        mockMvc.perform(patch("/v1/products/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Camiseta"))
                .andExpect(jsonPath("$.sellingPrice").value(59.90));
    }

    @Test
    void shouldSoftDeleteProduct() throws Exception {
        UUID id = createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");

        mockMvc.perform(delete("/v1/products/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/v1/products/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound());

        Product stored = productRepository.findById(id).orElseThrow();
        assertFalse(stored.getActive());
    }

    @Test
    void shouldClearProductLinkWhenProductIsSoftDeleted() throws Exception {
        UUID productId = createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");
        UUID costId = createVariableCost(productId, "Tecido", "15.00");

        mockMvc.perform(delete("/v1/products/{id}", productId)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        VariableCost stored = variableCostRepository.findById(costId).orElseThrow();
        assertNull(stored.getProductId());
        assertTrue(stored.getActive());
    }

    @Test
    void shouldKeepOtherProductsCostLinkWhenProductIsSoftDeleted() throws Exception {
        UUID deletedProductId = createProduct("Camiseta", ItemType.PRODUTO, "20.00", "50.00");
        UUID keptProductId = createProduct("Calça Jeans", ItemType.PRODUTO, "40.00", "99.90");
        UUID keptCostId = createVariableCost(keptProductId, "Jeans", "30.00");

        mockMvc.perform(delete("/v1/products/{id}", deletedProductId)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        VariableCost stored = variableCostRepository.findById(keptCostId).orElseThrow();
        assertEquals(keptProductId, stored.getProductId());
    }

    @Test
    void shouldNotAccessAnotherUsersProduct() throws Exception {
        UUID id = createProduct("Camiseta da Maria", ItemType.PRODUTO, "20.00", "50.00");
        User otherUser = createOtherUser("João Souza", "joao.prod@email.com", "99ABC345000199");

        mockMvc.perform(get("/v1/products/{id}", id)
                        .header("Authorization", tokenFor(otherUser)))
                .andExpect(status().isNotFound());
    }
}
