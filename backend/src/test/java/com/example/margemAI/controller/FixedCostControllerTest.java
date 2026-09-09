package com.example.margemAI.controller;

import com.example.margemAI.dto.request.FixedCostRequest;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FixedCostRepository;
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
import java.time.LocalDate;
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
public class FixedCostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
        Segment segment = ensureSegment("COMERCIO");

        savedUser = userRepository.save(User.builder()
                .name("Maria Silva")
                .email("maria.fixed@email.com")
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj("12ABC345000191")
                .segment(segment)
                .build());

        accessToken = jwtService.generateAccessToken(savedUser);
    }

    private Segment ensureSegment(String code) {
        return segmentRepository.findByCodeIgnoreCase(code)
                .orElseGet(() -> segmentRepository.save(Segment.builder()
                        .code(code)
                        .name("Comércio Varejista e Atacadista")
                        .active(true)
                        .build()));
    }

    private String bearerHeader() {
        return "Bearer " + accessToken;
    }

    private UUID createFixedCost(FixedCostCategory category, String name, String amount) {
        return createFixedCostFor(category, name, amount, savedUser);
    }

    private UUID createFixedCostFor(FixedCostCategory category, String name, String amount, User owner) {
        FixedCost cost = fixedCostRepository.save(FixedCost.builder()
                .name(name)
                .amount(new BigDecimal(amount))
                .category(category)
                .dueDate(LocalDate.of(2026, 7, 5))
                .recurring(true)
                .active(true)
                .user(owner)
                .build());
        return cost.getId();
    }

    private User createOtherUser(String name, String email, String cnpj) {
        return userRepository.save(User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode("Senha@123"))
                .cnpj(cnpj)
                .segment(ensureSegment("SERVICOS"))
                .build());
    }

    private String tokenFor(User user) {
        return "Bearer " + jwtService.generateAccessToken(user);
    }

    @Test
    void shouldReturn401WhenListingFixedCostsWithoutToken() throws Exception {
        mockMvc.perform(get("/v1/costs/fixed"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void shouldCreateFixedCostAndReturn201() throws Exception {
        FixedCostRequest request = FixedCostRequest.builder()
                .name("DAS MEI")
                .amount(new BigDecimal("81.90"))
                .category(FixedCostCategory.DAS_MEI)
                .build();

        mockMvc.perform(post("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("DAS MEI"))
                .andExpect(jsonPath("$.amount").value(81.90))
                .andExpect(jsonPath("$.category").value("DAS_MEI"))
                .andExpect(jsonPath("$.recurring").value(true))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.id").exists());

        assertEquals(1, fixedCostRepository.count());
    }

    @Test
    void shouldReturn400WhenCreatingWithInvalidAmount() throws Exception {
        FixedCostRequest request = FixedCostRequest.builder()
                .name("Internet")
                .amount(new BigDecimal("0"))
                .category(FixedCostCategory.INTERNET)
                .build();

        mockMvc.perform(post("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn400WhenCreatingWithUnknownCategory() throws Exception {
        String body = """
                {"name":"Custo","amount":10.00,"category":"CATEGORIA_INVALIDA"}
                """;

        mockMvc.perform(post("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldListFixedCostsPaginated() throws Exception {
        createFixedCost(FixedCostCategory.ALUGUEL, "Aluguel", "1500.00");
        createFixedCost(FixedCostCategory.INTERNET, "Internet", "120.00");
        createFixedCost(FixedCostCategory.DAS_MEI, "DAS MEI", "81.90");

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(3))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(1))
                .andExpect(jsonPath("$.last").value(true));
    }

    @Test
    void shouldListFixedCostsFilteredByCategory() throws Exception {
        createFixedCost(FixedCostCategory.ALUGUEL, "Aluguel", "1500.00");
        createFixedCost(FixedCostCategory.DAS_MEI, "DAS MEI", "81.90");

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("category", "DAS_MEI"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].category").value("DAS_MEI"));
    }

    @Test
    void shouldReturn400WhenCategoryParamIsInvalid() throws Exception {
        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("category", "NAO_EXISTE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.details[0]").value(
                        "O valor 'NAO_EXISTE' não é suportado para 'category'."));
    }

    @Test
    void shouldReturn400WhenMonthParamIsInvalid() throws Exception {
        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("month", "13/2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn400WhenPageIsNegative() throws Exception {
        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldReturn400WhenSizeIsOutOfRange() throws Exception {
        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldListRecurringCostsForReferenceMonth() throws Exception {
        createFixedCost(FixedCostCategory.ALUGUEL, "Aluguel", "1500.00");

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("month", "2026-07"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].dueDate").value("2026-07-05"));
    }

    @Test
    void shouldListRecurringCostForAnyReferenceMonth() throws Exception {
        createFixedCost(FixedCostCategory.ALUGUEL, "Aluguel", "1500.00");

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("month", "2026-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].category").value("ALUGUEL"));
    }

    @Test
    void shouldExcludeNonRecurringCostWithoutDueDateFromMonthFilter() throws Exception {
        fixedCostRepository.save(FixedCost.builder()
                .name("Taxa única")
                .amount(new BigDecimal("50.00"))
                .category(FixedCostCategory.TAXA_MAQUININHA)
                .recurring(false)
                .active(true)
                .user(savedUser)
                .build());

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("month", "2026-07"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void shouldListNonRecurringCostWithinReferenceMonth() throws Exception {
        fixedCostRepository.save(FixedCost.builder()
                .name("Manutenção")
                .amount(new BigDecimal("200.00"))
                .category(FixedCostCategory.MANUTENCAO)
                .dueDate(LocalDate.of(2026, 7, 20))
                .recurring(false)
                .active(true)
                .user(savedUser)
                .build());

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader())
                        .param("month", "2026-07"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Manutenção"));
    }

    @Test
    void shouldReturnFixedCostById() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.PRO_LABORE, "Pró-labore", "3000.00");

        mockMvc.perform(get("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.name").value("Pró-labore"))
                .andExpect(jsonPath("$.category").value("PRO_LABORE"));
    }

    @Test
    void shouldReturn404WhenFixedCostDoesNotExist() throws Exception {
        mockMvc.perform(get("/v1/costs/fixed/{id}", UUID.randomUUID())
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void shouldFullyUpdateFixedCostWithPut() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.ENERGIA, "Energia", "250.00");

        FixedCostRequest request = FixedCostRequest.builder()
                .name("Energia nova")
                .amount(new BigDecimal("280.00"))
                .category(FixedCostCategory.ENERGIA)
                .build();

        mockMvc.perform(put("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Energia nova"))
                .andExpect(jsonPath("$.amount").value(280.00));

        mockMvc.perform(get("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Energia nova"))
                .andExpect(jsonPath("$.amount").value(280.00));
    }

    @Test
    void shouldPatchOnlyAmount() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.INTERNET, "Internet", "120.00");

        FixedCostRequest request = FixedCostRequest.builder()
                .amount(new BigDecimal("130.00"))
                .build();

        mockMvc.perform(patch("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Internet"))
                .andExpect(jsonPath("$.amount").value(130.00))
                .andExpect(jsonPath("$.category").value("INTERNET"));
    }

    @Test
    void shouldSoftDeleteFixedCostAndPreserveRecord() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.MARKETING, "Marketing", "500.00");

        mockMvc.perform(delete("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNotFound());

        FixedCost stored = fixedCostRepository.findById(id).orElseThrow();
        assertFalse(stored.getActive());
        assertEquals("Marketing", stored.getName());

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void shouldReturn204WhenDeletingAlreadyDeletedCost() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.MARKETING, "Marketing", "500.00");

        mockMvc.perform(delete("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldClearDueDateOnFullUpdate() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.INTERNET, "Internet", "120.00");

        FixedCostRequest request = FixedCostRequest.builder()
                .name("Internet")
                .amount(new BigDecimal("120.00"))
                .category(FixedCostCategory.INTERNET)
                .dueDate(null)
                .build();

        mockMvc.perform(put("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dueDate").value(org.hamcrest.Matchers.nullValue()));
    }

    @Test
    void shouldIgnoreNullDueDateOnPatch() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.INTERNET, "Internet", "120.00");

        FixedCostRequest request = FixedCostRequest.builder()
                .dueDate(null)
                .build();

        mockMvc.perform(patch("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dueDate").value("2026-07-05"));
    }

    @Test
    void shouldReturn400WhenPatchingBlankName() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.INTERNET, "Internet", "120.00");

        FixedCostRequest request = FixedCostRequest.builder()
                .name("   ")
                .build();

        mockMvc.perform(patch("/v1/costs/fixed/{id}", id)
                        .header("Authorization", bearerHeader())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void shouldNotAllowUpdateOfAnotherUsersCost() throws Exception {
        UUID id = createFixedCost(FixedCostCategory.ALUGUEL, "Aluguel", "1500.00");

        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");
        String otherToken = tokenFor(otherUser);

        FixedCostRequest request = FixedCostRequest.builder()
                .name("Aluguel")
                .amount(new BigDecimal("1500.00"))
                .category(FixedCostCategory.ALUGUEL)
                .build();

        mockMvc.perform(put("/v1/costs/fixed/{id}", id)
                        .header("Authorization", otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldNotListAnotherUsersFixedCosts() throws Exception {
        createFixedCostFor(FixedCostCategory.ALUGUEL, "Aluguel da Maria", "1500.00", savedUser);
        createFixedCostFor(FixedCostCategory.DAS_MEI, "DAS do João", "81.90", createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123"));

        mockMvc.perform(get("/v1/costs/fixed")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Aluguel da Maria"));
    }

    @Test
    void shouldNotReturnAnotherUsersFixedCostById() throws Exception {
        UUID id = createFixedCostFor(FixedCostCategory.ALUGUEL, "Aluguel da Maria", "1500.00", savedUser);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        mockMvc.perform(get("/v1/costs/fixed/{id}", id)
                        .header("Authorization", tokenFor(otherUser)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldNotPatchAnotherUsersFixedCost() throws Exception {
        UUID id = createFixedCostFor(FixedCostCategory.ALUGUEL, "Aluguel da Maria", "1500.00", savedUser);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        FixedCostRequest request = FixedCostRequest.builder()
                .amount(new BigDecimal("1600.00"))
                .build();

        mockMvc.perform(patch("/v1/costs/fixed/{id}", id)
                        .header("Authorization", tokenFor(otherUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldNotDeleteAnotherUsersFixedCost() throws Exception {
        UUID id = createFixedCostFor(FixedCostCategory.ALUGUEL, "Aluguel da Maria", "1500.00", savedUser);
        User otherUser = createOtherUser("João Souza", "joao@email.com", "ZZ1234567890123");

        mockMvc.perform(delete("/v1/costs/fixed/{id}", id)
                        .header("Authorization", tokenFor(otherUser)))
                .andExpect(status().isNotFound());

        assertTrue(fixedCostRepository.findById(id).orElseThrow().getActive());
    }

    @Test
    void shouldReturnFixedCostWhenSearchingByRootPath() throws Exception {
        createFixedCost(FixedCostCategory.SOFTWARE, "Software", "90.00");

        mockMvc.perform(get("/costs/fixed")
                        .header("Authorization", bearerHeader()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }
}
