package com.example.margemAI.service;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.Sale;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.SaleRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

@SpringBootTest
@Transactional
class AlertRevenueIntegrationTest {
    @Autowired private AlertService alertService;
    @Autowired private SaleRepository sales;
    @Autowired private UserRepository users;
    @Autowired private SegmentRepository segments;

    @Test
    @DisplayName("Deve somar apenas vendas do titular dentro do ano fiscal corrente")
    void shouldRestrictRevenueToCurrentYearAndOwner() {
        int year = LocalDate.now().getYear();
        User owner = createUser("mei.year@test.com", "12345678000177");
        User other = createUser("other.mei.year@test.com", "12345678000188");
        createSale(owner, LocalDateTime.of(year - 1, 12, 31, 23, 59, 59), "9000.00");
        createSale(owner, LocalDateTime.of(year, 1, 1, 0, 0), "100.00");
        createSale(owner, LocalDateTime.of(year, 12, 31, 23, 59, 59), "250.00");
        createSale(owner, LocalDateTime.of(year + 1, 1, 1, 0, 0), "8000.00");
        createSale(other, LocalDateTime.of(year, 6, 15, 12, 0), "7000.00");
        sales.flush();
        var response = alertService.getMeiCapStatus(owner.getId(), null);
        assertFalse(response.isSimulationMode());
        assertEquals(0, new BigDecimal("350.00").compareTo(response.getAccumulatedRevenue()));
    }

    private User createUser(String email, String cnpj) {
        return users.save(User.builder().name("Titular MEI").email(email).password("hash").cnpj(cnpj)
                .segment(segments.findByCodeIgnoreCase("COMERCIO").orElseThrow()).build());
    }

    private void createSale(User user, LocalDateTime date, String amount) {
        BigDecimal gross = new BigDecimal(amount);
        sales.save(Sale.builder().user(user).description("Venda fiscal").quantity(BigDecimal.ONE)
                .unitPrice(gross).grossAmount(gross).paymentMethod(PaymentMethod.PIX)
                .feePercentage(BigDecimal.ZERO).feeAmount(BigDecimal.ZERO).netAmount(gross).soldAt(date).build());
    }
}
