package com.example.margemAI.controller;
import com.example.margemAI.model.*;
import com.example.margemAI.repository.*;
import com.example.margemAI.security.service.JwtService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class BusinessAccountControllerTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired SegmentRepository segments;
    @Autowired BusinessAccountRepository accounts;
    @Autowired JwtService jwt;
    String token;
    BusinessAccount own, foreign;
    @BeforeEach void setup() {
        var segment = segments.findByCodeIgnoreCase("COMERCIO").orElseThrow();
        var user = users.save(User.builder().name("Titular").email("accounts@test.com").password("hash").cnpj("12345678000155").segment(segment).build());
        var other = users.save(User.builder().name("Outro").email("other.accounts@test.com").password("hash").cnpj("12345678000166").segment(segment).build());
        token = "Bearer " + jwt.generateAccessToken(user);
        own = accounts.save(BusinessAccount.builder().name("Própria").openingBalance(new BigDecimal("100.00")).openingDate(LocalDate.of(2026,1,1)).user(user).build());
        foreign = accounts.save(BusinessAccount.builder().name("Alheia").openingBalance(BigDecimal.ZERO).openingDate(LocalDate.of(2026,1,1)).user(other).build());
    }
    @Test @DisplayName("Lista apenas contas do titular e exige autenticação")
    void isolation() throws Exception {
        mvc.perform(get("/accounts")).andExpect(status().isUnauthorized());
        mvc.perform(get("/accounts").header("Authorization",token)).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].name").value("Própria"));
        mvc.perform(get("/accounts/movements").param("accountId",foreign.getId().toString()).header("Authorization",token)).andExpect(status().isNotFound());
    }
    @Test @DisplayName("Pró-labore reduz saldo e não cria custo fixo")
    void proLabore() throws Exception {
        mvc.perform(post("/accounts/movements").header("Authorization",token).contentType(MediaType.APPLICATION_JSON).content("""
            {"accountId":"%s","type":"PRO_LABORE","amount":25.50,"date":"2026-02-01","description":"Pagamento"}
            """.formatted(own.getId()))).andExpect(status().isCreated());
        mvc.perform(get("/accounts").header("Authorization",token)).andExpect(jsonPath("$[0].balance").value(74.50));
        mvc.perform(get("/costs/fixed").header("Authorization",token)).andExpect(jsonPath("$.totalElements").value(0));
    }
    @Test @DisplayName("Rejeita valor zero e data futura")
    void validation() throws Exception {
        mvc.perform(post("/accounts/movements").header("Authorization",token).contentType(MediaType.APPLICATION_JSON).content("""
            {"accountId":"%s","type":"APORTE","amount":0,"date":"2999-01-01","description":"Inválido"}
            """.formatted(own.getId()))).andExpect(status().isBadRequest());
    }
}
