package com.example.margemAI.controller;

import com.example.margemAI.dto.request.VariableCostRequest;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
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
public class VariableCostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
                .email("maria.variable@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("12ABC345000192")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    private UUID createVariableCost(VariableCostCategory category, String name, String unitAmount, UUID productId) {
        return createVariableCostFor(category, name, unitAmount, productId, savedUser);
    }

    private UUID createVariableCostFor(VariableCostCategory category, String name, String unitAmount, UUID productId, User owner) {
        return variableCostRepository.save(VariableCost.builder()
                .name(name)
                .unitAmount(new BigDecimal(unitAmount))
                .category(category)
                .productId(productId)
                .active(true)
                .user(owner)
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
        mockMvc.perform(get("/v1/costs/variable"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldCreateVariableCostAndReturn201() throws Exception {
        UUID productId = UUID.randomUUID();
        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido")
                .unitAmount(new BigDecimal("25.50"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .productId(productId)
                .build();

        mockMvc.perform(post("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Tecido"))
                .andExpect(jsonPath("$.unitAmount").value(25.50))
                .andExpect(jsonPath("$.category").value("MATERIA_PRIMA"))
                .andExpect(jsonPath("$.productId").value(productId.toString()))
                .andExpect(jsonPath("$.id").exists());

        assertEquals(1, variableCostRepository.count());
    }

    @Test
    void shouldReturn400WhenCreatingWithoutCategory() throws Exception {
        VariableCostRequest request = VariableCostRequest.builder()
                .name("Frete")
                .unitAmount(new BigDecimal("15.00"))
                .build();

        mockMvc.perform(post("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldListVariableCostsPaginated() throws Exception {
        createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido", "25.50", null);
        createVariableCost(VariableCostCategory.EMBALAGEM, "Caixa", "3.00", null);
        createVariableCost(VariableCostCategory.FRETE, "Frete", "15.00", null);

        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void shouldListVariableCostsFilteredByProduct() throws Exception {
        UUID productId = UUID.randomUUID();
        createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido", "25.50", productId);
        createVariableCost(VariableCostCategory.EMBALAGEM, "Caixa", "3.00", null);

        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .param("productId", productId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Tecido"));
    }

    @Test
    void shouldListVariableCostsFilteredByCategory() throws Exception {
        createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido", "25.50", null);
        createVariableCost(VariableCostCategory.EMBALAGEM, "Caixa", "3.00", null);
        createVariableCost(VariableCostCategory.FRETE, "Frete", "15.00", null);

        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .param("category", "EMBALAGEM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].category").value("EMBALAGEM"));
    }

    @Test
    void shouldReturn400WhenCategoryParamIsInvalid() throws Exception {
        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .param("category", "NAO_EXISTE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0]").value(
                        "O valor 'NAO_EXISTE' não é suportado para 'category'."));
    }

    @Test
    void shouldReturnVariableCostById() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.COMISSAO, "Comissão", "5.00", null);

        mockMvc.perform(get("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Comissão"))
                .andExpect(jsonPath("$.category").value("COMISSAO"));
    }

    @Test
    void shouldReturn404WhenVariableCostDoesNotExist() throws Exception {
        mockMvc.perform(get("/v1/costs/variable/{id}", UUID.randomUUID())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldFullyUpdateVariableCostWithPut() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido", "25.50", null);

        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido premium")
                .unitAmount(new BigDecimal("35.00"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .build();

        mockMvc.perform(put("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tecido premium"))
                .andExpect(jsonPath("$.unitAmount").value(35.00));
    }

    @Test
    void shouldPatchOnlyUnitAmount() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.EMBALAGEM, "Caixa", "3.00", null);

        VariableCostRequest request = VariableCostRequest.builder()
                .unitAmount(new BigDecimal("3.50"))
                .build();

        mockMvc.perform(patch("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Caixa"))
                .andExpect(jsonPath("$.unitAmount").value(3.50));
    }

    @Test
    void shouldSoftDeleteVariableCostAndPreserveRecord() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.TAXA_PAGAMENTO, "Taxa maquininha", "4.00", null);

        mockMvc.perform(delete("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound());

        VariableCost stored = variableCostRepository.findById(id).orElseThrow();
        assertFalse(stored.getActive());
        assertEquals("Taxa maquininha", stored.getName());

        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void shouldReturn204WhenDeletingAlreadyDeletedCost() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.TAXA_PAGAMENTO, "Taxa maquininha", "4.00", null);

        mockMvc.perform(delete("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldClearProductIdOnFullUpdate() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido", "25.50", UUID.randomUUID());

        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido")
                .unitAmount(new BigDecimal("25.50"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .productId(null)
                .build();

        mockMvc.perform(put("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void shouldReturn400WhenPageIsNegative() throws Exception {
        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn400WhenSizeIsOutOfRange() throws Exception {
        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader())
                        .param("size", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturnProductNameAsNullInResponse() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido", "25.50", null);

        mockMvc.perform(get("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productName").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void shouldReturn400WhenPatchingBlankName() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.EMBALAGEM, "Caixa", "3.00", null);

        VariableCostRequest request = VariableCostRequest.builder()
                .name("   ")
                .build();

        mockMvc.perform(patch("/v1/costs/variable/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldListVariableCostsByRootPath() throws Exception {
        createVariableCost(VariableCostCategory.OUTRO, "Outro custo", "2.00", null);

        mockMvc.perform(get("/costs/variable")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void shouldNotListAnotherUsersVariableCosts() throws Exception {
        createVariableCostFor(VariableCostCategory.MATERIA_PRIMA, "Tecido da Maria", "25.50", null, savedUser);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");
        createVariableCostFor(VariableCostCategory.EMBALAGEM, "Caixa do João", "3.00", null, otherUser);

        mockMvc.perform(get("/v1/costs/variable")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Tecido da Maria"));
    }

    @Test
    void shouldNotReturnAnotherUsersVariableCostById() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido da Maria", "25.50", null);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        mockMvc.perform(get("/v1/costs/variable/{id}", id)
                        .header("Authorization", tokenFor(otherUser)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldNotUpdateAnotherUsersVariableCost() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido da Maria", "25.50", null);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido da Maria")
                .unitAmount(new BigDecimal("25.50"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .build();

        mockMvc.perform(put("/v1/costs/variable/{id}", id)
                        .header("Authorization", tokenFor(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldNotPatchAnotherUsersVariableCost() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido da Maria", "25.50", null);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        VariableCostRequest request = VariableCostRequest.builder()
                .unitAmount(new BigDecimal("30.00"))
                .build();

        mockMvc.perform(patch("/v1/costs/variable/{id}", id)
                        .header("Authorization", tokenFor(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldNotDeleteAnotherUsersVariableCost() throws Exception {
        UUID id = createVariableCost(VariableCostCategory.MATERIA_PRIMA, "Tecido da Maria", "25.50", null);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        mockMvc.perform(delete("/v1/costs/variable/{id}", id)
                        .header("Authorization", tokenFor(otherUser)))
                .andExpect(status().isNotFound());

        assertTrue(variableCostRepository.findById(id).orElseThrow().getActive());
    }
}
