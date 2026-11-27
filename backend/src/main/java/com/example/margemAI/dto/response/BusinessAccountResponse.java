package com.example.margemAI.dto.response;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record BusinessAccountResponse(UUID id, String name, BigDecimal openingBalance, LocalDate openingDate, BigDecimal balance) {}
