package com.example.margemAI.service;

import com.example.margemAI.model.Sale;
import com.example.margemAI.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class HistoricalSaleCostInitializer implements ApplicationRunner {
    private final SaleRepository saleRepository;
    private final SaleService saleService;

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        for (Sale sale : saleRepository.findByOperationCostIsNull()) {
            saleService.snapshotCost(sale, saleService.resolveUnitCost(sale.getUser().getId(), sale.getProduct(), null));
            sale.setCostEstimated(true);
        }
    }
}
