package com.example.margemAI.service;

import com.example.margemAI.dto.request.ReserveMovementRequest;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.model.FinancialReserve;
import com.example.margemAI.model.ReserveMovement.Type;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FinancialReserveRepository;
import com.example.margemAI.repository.ReserveMovementRepository;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class FinancialReserveConcurrencyTest {

    @Autowired
    FinancialReserveService service;

    @Autowired
    FinancialReserveRepository reserves;

    @Autowired
    ReserveMovementRepository movements;

    @Autowired
    UserRepository users;

    @Autowired
    SegmentRepository segments;

    @Autowired
    TransactionTemplate transactions;

    User user;

    @BeforeEach
    void setup() {
        Segment segment = segments.findByCodeIgnoreCase("COMERCIO").orElseThrow();
        user = users.save(User.builder()
                .name("Titular Concorrência")
                .email("reserve.concurrency@test.com")
                .password("hash")
                .cnpj("12345678000199")
                .segment(segment)
                .build());
        reserves.save(FinancialReserve.builder()
                .user(user)
                .currentBalance(new BigDecimal("100.00"))
                .build());
    }

    @AfterEach
    void cleanup() {
        movements.deleteAll(movements.findOwned(user.getId()));
        reserves.findByUserId(user.getId()).ifPresent(reserves::delete);
        users.delete(user);
    }

    @Test
    @DisplayName("Serializa resgates simultâneos e recusa o segundo quando o primeiro já consumiu o saldo")
    void concurrentWithdrawalsDoNotOverdrawReserve() throws Exception {
        CountDownLatch firstApplied = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);

        CompletableFuture<Void> first = CompletableFuture.runAsync(() -> transactions.executeWithoutResult(status -> {
            service.createMovement(user.getId(), withdrawal("Primeiro resgate"));
            firstApplied.countDown();
            await(releaseFirst);
        }));
        assertTrue(firstApplied.await(5, TimeUnit.SECONDS));

        CompletableFuture<Void> second = CompletableFuture.runAsync(
                () -> service.createMovement(user.getId(), withdrawal("Segundo resgate")));
        Thread.sleep(300);
        assertFalse(second.isDone(), "o segundo resgate deveria aguardar o primeiro terminar");

        releaseFirst.countDown();
        first.get(5, TimeUnit.SECONDS);
        ExecutionException failure = assertThrows(ExecutionException.class, () -> second.get(5, TimeUnit.SECONDS));
        assertInstanceOf(InvalidRequestException.class, failure.getCause());

        assertEquals(new BigDecimal("20.00"), reserves.findByUserId(user.getId()).orElseThrow().getCurrentBalance());
        assertEquals(1, movements.findOwned(user.getId()).size());
    }

    private static ReserveMovementRequest withdrawal(String description) {
        return new ReserveMovementRequest(Type.WITHDRAWAL, new BigDecimal("80.00"), description, LocalDate.of(2026, 3, 12), null);
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
