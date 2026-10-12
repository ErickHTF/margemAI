package com.example.margemAI.dto.request;
import com.example.margemAI.model.AccountMovement.Type;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record AccountMovementRequest(
    @NotNull UUID accountId, UUID destinationId, @NotNull Type type,
    @NotNull @DecimalMin("0.01") @Digits(integer = 17, fraction = 2) BigDecimal amount,
    @NotNull @PastOrPresent LocalDate date,
    @NotBlank @Size(max = 200) String description) {}
