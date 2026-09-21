package com.example.margemAI.service;

import com.example.margemAI.event.CategoryChangedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class CategoryParameterCache {

    private final Map<UUID, Map<UUID, CategoryParameters>> byTenant = new ConcurrentHashMap<>();

    public Optional<CategoryParameters> get(UUID userId, UUID categoryId) {
        Map<UUID, CategoryParameters> tenantCache = byTenant.get(userId);
        return tenantCache == null ? Optional.empty() : Optional.ofNullable(tenantCache.get(categoryId));
    }

    public void put(UUID userId, UUID categoryId, CategoryParameters parameters) {
        byTenant.computeIfAbsent(userId, key -> new ConcurrentHashMap<>()).put(categoryId, parameters);
    }

    public void evictTenant(UUID userId) {
        byTenant.remove(userId);
    }

    @EventListener
    public void onCategoryChanged(CategoryChangedEvent event) {
        evictTenant(event.userId());
    }
}
