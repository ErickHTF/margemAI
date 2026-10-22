package com.example.margemAI.controller;

import com.example.margemAI.model.BusinessAccount;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.BusinessAccountRepository;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.security.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FinancialReserveControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    SegmentRepository segments;

    @Autowired
    BusinessAccountRepository accounts;

    @Autowired
    FixedCostRepository fixedCosts;

    @Autowired
    SaleRepository sales;

    @Autowired
    JwtService jwt;

    String token;
    String otherToken;
    User user;
    User other;
    BusinessAccount ownAccount;
    BusinessAccount foreignAccount;

    @BeforeEach
    void setup() {
        Segment segment = segments.findByCodeIgnoreCase("COMERCIO").orElseThrow();
        user = users.save(User.builder()
                .name("Titular Reserva")
                .email("reserves@test.com")
                .password("hash")
                .cnpj("12345678000177")
                .segment(segment)
                .build());
        other = users.save(User.builder()
                .name("Outro Titular")
                .email("other.reserves@test.com")
                .password("hash")
                .cnpj("12345678000188")
                .segment(segment)
                .build());
        token = "Bearer " + jwt.generateAccessToken(user);
        otherToken = "Bearer " + jwt.generateAccessToken(other);

        ownAccount = accounts.save(BusinessAccount.builder()
                .name("Conta Principal PJ")
                .openingBalance(new BigDecimal("5200.00"))
                .openingDate(LocalDate.of(2026, 1, 1))
                .user(user)
                .build());
        foreignAccount = accounts.save(BusinessAccount.builder()
                .name("Conta Alheia")
                .openingBalance(new BigDecimal("9000.00"))
                .openingDate(LocalDate.of(2026, 1, 1))
                .user(other)
                .build());
    }

    @Test
    @DisplayName("Exige autenticação e isola a reserva e as contas por usuário")
    void authenticationAndIsolation() throws Exception {
        mvc.perform(get("/v1/reserves")).andExpect(status().isUnauthorized());

        mvc.perform(put("/v1/reserves/goal")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"goalMode":"FIXED_AMOUNT","targetAmount":6000.00,"targetMonths":0}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.effectiveTargetAmount").value(6000.00))
                .andExpect(jsonPath("$.totalBusinessAccountsBalance").value(5200.00));

        mvc.perform(get("/v1/reserves").header("Authorization", otherToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.effectiveTargetAmount").value(0.00))
                .andExpect(jsonPath("$.totalBusinessAccountsBalance").value(9000.00));

        mvc.perform(post("/v1/reserves/movements")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"DEPOSIT","amount":300.00,"description":"Aporte inválido","occurredAt":"2026-02-10","businessAccountId":"%s"}
                                """.formatted(foreignAccount.getId())))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Configura meta em meses de custos fixos e alerta quando não há custos fixos cadastrados")
    void monthsOfCostsGoalWithAndWithoutFixedCosts() throws Exception {
        mvc.perform(put("/v1/reserves/goal")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"goalMode":"MONTHS_OF_COSTS","targetMonths":3}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.goalMode").value("MONTHS_OF_COSTS"))
                .andExpect(jsonPath("$.missingFixedCostsForMonthsGoal").value(true))
                .andExpect(jsonPath("$.effectiveTargetAmount").value(0.00));

        fixedCosts.save(FixedCost.builder()
                .name("Aluguel do ponto")
                .amount(new BigDecimal("1400.00"))
                .category(FixedCostCategory.ALUGUEL)
                .dueDate(LocalDate.of(2026, 1, 10))
                .recurring(true)
                .active(true)
                .user(user)
                .build());

        mvc.perform(get("/v1/reserves").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.missingFixedCostsForMonthsGoal").value(false))
                .andExpect(jsonPath("$.monthlyFixedCosts").value(1400.00))
                .andExpect(jsonPath("$.effectiveTargetAmount").value(4200.00));
    }

    @Test
    @DisplayName("Registra aporte e resgate, separa saldo livre do reservado, bloqueia resgate excessivo e não cria vendas")
    void movementsProgressFreeBalanceAndNoFictitiousSales() throws Exception {
        long salesBefore = sales.count();

        mvc.perform(put("/v1/reserves/goal")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"goalMode":"FIXED_AMOUNT","targetAmount":4000.00}
                                """))
                .andExpect(status().isOk());

        mvc.perform(post("/v1/reserves/movements")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"DEPOSIT","amount":1500.00,"description":"Primeiro aporte para emergência","occurredAt":"2026-02-05","businessAccountId":"%s"}
                                """.formatted(ownAccount.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("DEPOSIT"))
                .andExpect(jsonPath("$.amount").value(1500.00))
                .andExpect(jsonPath("$.balanceAfter").value(1500.00))
                .andExpect(jsonPath("$.businessAccountName").value("Conta Principal PJ"));

        mvc.perform(post("/v1/reserves/movements")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"WITHDRAWAL","amount":1600.00,"description":"Resgate maior que o saldo","occurredAt":"2026-02-06"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mvc.perform(post("/v1/reserves/movements")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"WITHDRAWAL","amount":300.00,"description":"Conserto urgente de freezer","occurredAt":"2026-02-07"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("WITHDRAWAL"))
                .andExpect(jsonPath("$.balanceAfter").value(1200.00));

        mvc.perform(get("/v1/reserves").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reservedBalance").value(1200.00))
                .andExpect(jsonPath("$.totalBusinessAccountsBalance").value(5200.00))
                .andExpect(jsonPath("$.freeBalance").value(4000.00))
                .andExpect(jsonPath("$.progressPercent").value(30.00))
                .andExpect(jsonPath("$.movements.length()").value(2))
                .andExpect(jsonPath("$.movements[0].type").value("WITHDRAWAL"))
                .andExpect(jsonPath("$.movements[1].type").value("DEPOSIT"));

        assertEquals(salesBefore, sales.count());
    }
}
