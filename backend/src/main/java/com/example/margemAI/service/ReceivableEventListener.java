package com.example.margemAI.service;

import com.example.margemAI.event.SaleDeletedEvent;
import com.example.margemAI.event.SaleRegisteredEvent;
import com.example.margemAI.event.SaleUpdatedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ReceivableEventListener {

    private final ReceivableService receivableService;

    @EventListener
    public void onSaleRegistered(SaleRegisteredEvent event) {
        if (event != null && event.sale() != null) {
            receivableService.createFromSale(event.sale());
        }
    }

    @EventListener
    public void onSaleUpdated(SaleUpdatedEvent event) {
        if (event != null && event.sale() != null) {
            receivableService.syncFromSale(event.sale());
        }
    }

    @EventListener
    public void onSaleDeleted(SaleDeletedEvent event) {
        if (event != null && event.saleId() != null && event.userId() != null) {
            receivableService.deleteBySaleId(event.userId(), event.saleId());
        }
    }
}
