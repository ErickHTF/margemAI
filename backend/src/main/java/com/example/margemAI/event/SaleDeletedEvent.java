package com.example.margemAI.event;

import java.util.UUID;

public record SaleDeletedEvent(UUID saleId, UUID userId) {
}
