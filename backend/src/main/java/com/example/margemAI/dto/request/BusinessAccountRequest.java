package com.example.margemAI.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
public record BusinessAccountRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull @Digits(integer = 17, fraction = 2) BigDecimal openingBalance,
    @NotNull @PastOrPresent LocalDate openingDate) {}
