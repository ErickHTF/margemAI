package com.example.margemAI.controller;

import com.example.margemAI.dto.request.CategoryRequest;
import com.example.margemAI.dto.request.CategoryStatusRequest;
import com.example.margemAI.model.Category;
import com.example.margemAI.model.ItemType;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.CategoryRepository;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
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
public class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryRepository categoryRepository;

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
                .email("maria.category@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("12ABC345000199")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    private Category createCategory(String name, String slug, ItemType type, String margin) {
        return categoryRepository.save(Category.builder()
                .name(name)
                .slug(slug)
                .type(type)
                .targetProfitMargin(margin != null ? new BigDecimal(margin) : null)
                .active(true)
                .user(savedUser)
                .build());
    }

    private UUID createProduct(String name, String baseCost, String sellingPrice, Category category) {
        return productRepository.save(Product.builder()
                .name(name)
                .type(ItemType.PRODUTO)
                .baseCost(new BigDecimal(baseCost))
                .sellingPrice(new BigDecimal(sellingPrice))
                .category(category)
                .active(true)
                .user(savedUser)
                .build()).getId();
    }

    private User createOtherUser() {
        Segment segment = segmentRepository.findByCodeIgnoreCase("SERVICOS")
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code("SERVICOS")
                        .name("Prestação de Serviços")
                        .active(true)
                        .build()));
        return userRepository.save(User.builder()
                .name("João Souza")
                .email("joao.category@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("99ABC345000199")
                .segment(segment)
                .build());
    }

    @Test
    void shouldReturn401WhenListingWithoutToken() throws Exception {
        mockMvc.perform(get("/v1/categories"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldCreateCategoryAndReturn201() throws Exception {
        CategoryRequest request = CategoryRequest.builder()
                .name("Bebidas Geladas")
                .type(ItemType.PRODUTO)
                .targetProfitMargin(new BigDecimal("25.00"))
                .taxRate(new BigDecimal("6.00"))
                .maxDiscountAllowed(new BigDecimal("10.00"))
                .build();

        mockMvc.perform(post("/v1/categories")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Bebidas Geladas"))
                .andExpect(jsonPath("$.slug").value("bebidas-geladas"))
                .andExpect(jsonPath("$.targetProfitMargin").value(25.00))
                .andExpect(jsonPath("$.id").exists());
    }

    @Test
    void shouldReturn400WhenMarginOutOfRange() throws Exception {
        CategoryRequest request = CategoryRequest.builder()
                .name("Inválida")
                .type(ItemType.PRODUTO)
                .targetProfitMargin(new BigDecimal("120.00"))
                .build();

        mockMvc.perform(post("/v1/categories")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldListCategoriesPaginatedAndFiltered() throws Exception {
        createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");
        createCategory("Serviços de Limpeza", "servicos-de-limpeza", ItemType.SERVICO, "40.00");

        mockMvc.perform(get("/v1/categories")
                        .header("Authorization", bearerHeader())
                        .param("type", "PRODUTO"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Bebidas"));

        mockMvc.perform(get("/v1/categories")
                        .header("Authorization", bearerHeader())
                        .param("search", "Limpeza"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void shouldReturnCategoryById() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");

        mockMvc.perform(get("/v1/categories/{id}", category.getId())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(category.getId().toString()))
                .andExpect(jsonPath("$.slug").value("bebidas"));
    }

    @Test
    void shouldReturn404ForAnotherUsersCategory() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");
        User otherUser = createOtherUser();

        mockMvc.perform(get("/v1/categories/{id}", category.getId())
                        .header("Authorization", "Bearer " + jwtService.generateAccessToken(otherUser)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldUpdateCategoryWithPut() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");

        CategoryRequest request = CategoryRequest.builder()
                .name("Bebidas Premium")
                .type(ItemType.PRODUTO)
                .targetProfitMargin(new BigDecimal("30.00"))
                .build();

        mockMvc.perform(put("/v1/categories/{id}", category.getId())
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Bebidas Premium"))
                .andExpect(jsonPath("$.slug").value("bebidas-premium"))
                .andExpect(jsonPath("$.targetProfitMargin").value(30.00));
    }

    @Test
    void shouldPatchCategoryStatus() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");

        mockMvc.perform(patch("/v1/categories/{id}/status", category.getId())
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CategoryStatusRequest.builder().active(false).build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));
    }

    @Test
    void shouldReactivateInactiveCategory() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");

        mockMvc.perform(patch("/v1/categories/{id}/status", category.getId())
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CategoryStatusRequest.builder().active(false).build())))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/v1/categories/{id}/status", category.getId())
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(CategoryStatusRequest.builder().active(true).build())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
    }

    @Test
    void shouldSoftDeleteCategory() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");

        mockMvc.perform(delete("/v1/categories/{id}", category.getId())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        Category stored = categoryRepository.findById(category.getId()).orElseThrow();
        assertFalse(stored.getActive());
    }

    @Test
    void shouldBlockDeleteWhenActiveProductsLinked() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");
        createProduct("Refrigerante", "5.00", "10.00", category);

        mockMvc.perform(delete("/v1/categories/{id}", category.getId())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldRevalidateProductPricesFromCategoryMargin() throws Exception {
        Category category = createCategory("Bebidas", "bebidas", ItemType.PRODUTO, "25.00");
        UUID productId = createProduct("Refrigerante", "50.00", "10.00", category);

        mockMvc.perform(post("/v1/categories/{id}/revalidate-prices", category.getId())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedProducts").value(1));

        Product stored = productRepository.findById(productId).orElseThrow();
        assertEquals(0, new BigDecimal("66.67").compareTo(stored.getSellingPrice()));
    }
}
