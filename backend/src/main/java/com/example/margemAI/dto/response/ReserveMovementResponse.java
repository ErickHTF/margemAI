package com.example.margemAI.dto.response;

import com.example.margemAI.model.ReserveMovement.Type;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ReserveMovementResponse(
        UUID id,
        Type type,
        BigDecimal amount,
        String description,
        LocalDate occurredAt,
        UUID businessAccountId,
        String businessAccountName,
        BigDecimal balanceAfter
) {
}
