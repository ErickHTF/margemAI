package com.example.margemAI.controller;

import com.example.margemAI.model.Debt;
import com.example.margemAI.model.DebtInstallment;
import com.example.margemAI.model.DebtStatus;
import com.example.margemAI.model.InstallmentStatus;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.DebtInstallmentRepository;
import com.example.margemAI.repository.DebtRepository;
import com.example.margemAI.repository.FixedCostRepository;
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
import java.util.ArrayList;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DebtControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UserRepository users;

    @Autowired
    private SegmentRepository segments;

    @Autowired
    private DebtRepository debts;

    @Autowired
    private DebtInstallmentRepository installments;

    @Autowired
    private FixedCostRepository fixedCosts;

    @Autowired
    private JwtService jwt;

    private String token;
    private User ownUser;
    private User otherUser;
    private Debt ownDebt;
    private Debt otherDebt;

    @BeforeEach
    void setup() {
        var segment = segments.findByCodeIgnoreCase("COMERCIO").orElseThrow();
        ownUser = users.save(User.builder().name("Titular Dívidas").email("debts.own@test.com").password("hash").cnpj("12345678000177").segment(segment).build());
        otherUser = users.save(User.builder().name("Outro Titular").email("debts.other@test.com").password("hash").cnpj("12345678000188").segment(segment).build());
        token = "Bearer " + jwt.generateAccessToken(ownUser);

        ownDebt = debts.save(Debt.builder()
                .creditor("Banco Empréstimo")
                .description("Capital de Giro")
                .principalAmount(new BigDecimal("5000.00"))
                .monthlyInterestRate(new BigDecimal("2.5000"))
                .fixedFeesAmount(new BigDecimal("150.00"))
                .totalInstallments(5)
                .installmentAmount(new BigDecimal("1077.00"))
                .firstDueDate(LocalDate.of(2026, 11, 10))
                .status(DebtStatus.ACTIVE)
                .user(ownUser)
                .installments(new ArrayList<>())
                .build());

        for (int i = 1; i <= 5; i++) {
            DebtInstallment inst = DebtInstallment.builder()
                    .debt(ownDebt)
                    .installmentNumber(i)
                    .dueDate(LocalDate.of(2026, 10, 10).plusMonths(i))
                    .amount(new BigDecimal("1077.00"))
                    .status(InstallmentStatus.PENDING)
                    .build();
            ownDebt.addInstallment(inst);
        }
        ownDebt = debts.save(ownDebt);

        otherDebt = debts.save(Debt.builder()
                .creditor("Banco Alheio")
                .principalAmount(new BigDecimal("3000.00"))
                .monthlyInterestRate(new BigDecimal("4.0000"))
                .fixedFeesAmount(BigDecimal.ZERO)
                .totalInstallments(3)
                .installmentAmount(new BigDecimal("1081.00"))
                .firstDueDate(LocalDate.of(2026, 11, 15))
                .status(DebtStatus.ACTIVE)
                .user(otherUser)
                .installments(new ArrayList<>())
                .build());
    }

    @Test
    @DisplayName("Exige autenticação e isola dívidas por titular")
    void isolationAndSecurity() throws Exception {
        mvc.perform(get("/v1/debts")).andExpect(status().isUnauthorized());

        mvc.perform(get("/v1/debts").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].creditor").value("Banco Empréstimo"))
                .andExpect(jsonPath("$[0].effectiveCostMultiple").value(1.1070));

        mvc.perform(get("/v1/debts/" + otherDebt.getId()).header("Authorization", token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Cadastra nova dívida com parcelas automáticas e custo comparável")
    void createDebtSuccessfully() throws Exception {
        mvc.perform(post("/v1/debts")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "creditor": "Caixa Econômica",
                            "description": "Pronampe 2026",
                            "principalAmount": 20000.00,
                            "monthlyInterestRate": 1.25,
                            "fixedFeesAmount": 300.00,
                            "totalInstallments": 24,
                            "installmentAmount": 970.50,
                            "firstDueDate": "2026-12-01"
                        }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.creditor").value("Caixa Econômica"))
                .andExpect(jsonPath("$.principalAmount").value(20000.00))
                .andExpect(jsonPath("$.totalInstallments").value(24))
                .andExpect(jsonPath("$.totalContractedCost").value(23592.00))
                .andExpect(jsonPath("$.totalInterestAndFees").value(3592.00))
                .andExpect(jsonPath("$.effectiveCostPercent").value(17.96))
                .andExpect(jsonPath("$.installments.length()").value(24));
    }

    @Test
    @DisplayName("Simula quitação antecipada com hipóteses explícitas (CDC Art. 52 §2º)")
    void simulatePayoffWithAssumptions() throws Exception {
        mvc.perform(post("/v1/debts/" + ownDebt.getId() + "/simulate-payoff")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "installmentsToAnticipate": 2,
                            "simulationDate": "2026-11-01"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.debtId").value(ownDebt.getId().toString()))
                .andExpect(jsonPath("$.installmentsCount").value(2))
                .andExpect(jsonPath("$.simulatedInstallmentNumbers[0]").value(4))
                .andExpect(jsonPath("$.simulatedInstallmentNumbers[1]").value(5))
                .andExpect(jsonPath("$.originalTotalAmount").value(2154.00))
                .andExpect(jsonPath("$.payoffAmount").isNumber())
                .andExpect(jsonPath("$.estimatedSavings").isNumber())
                .andExpect(jsonPath("$.assumptions.length()").value(6));
    }

    @Test
    @DisplayName("Dá baixa em parcela sem duplicar custos fixos e registra pagamento")
    void payInstallmentWithoutDuplicateFixedCosts() throws Exception {
        DebtInstallment firstInst = ownDebt.getInstallments().getFirst();
        long fixedCostsBefore = fixedCosts.count();

        mvc.perform(post("/v1/debts/installments/" + firstInst.getId() + "/pay")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                        {
                            "paidAmount": 1077.00,
                            "paymentDate": "2026-11-10",
                            "notes": "Pago via Pix da conta PJ"
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidAmount").value(1077.00));

        // Não deve criar nenhum lançamento em fixed_costs!
        assertEquals(fixedCostsBefore, fixedCosts.count());
    }

    @Test
    @DisplayName("Exclui dívida e suas parcelas em cascata")
    void deleteDebtCascades() throws Exception {
        mvc.perform(delete("/v1/debts/" + ownDebt.getId()).header("Authorization", token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/v1/debts/" + ownDebt.getId()).header("Authorization", token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Retorna cronograma consolidado de parcelas do titular")
    void getSchedule() throws Exception {
        mvc.perform(get("/v1/debts/schedule").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[0].creditor").value("Banco Empréstimo"))
                .andExpect(jsonPath("$[0].installmentNumber").value(1));
    }
}
