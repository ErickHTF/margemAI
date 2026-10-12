package com.example.margemAI.dto.response;
import com.example.margemAI.model.AccountMovement.Type;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
public record AccountMovementResponse(UUID id, UUID accountId, UUID destinationId, Type type, BigDecimal amount, LocalDate date, String description) {}
