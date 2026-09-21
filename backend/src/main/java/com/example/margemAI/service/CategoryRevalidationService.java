package com.example.margemAI.service;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.model.Category;
import com.example.margemAI.model.Product;
import com.example.margemAI.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryRevalidationService {

    private final CategoryService categoryService;
    private final ProductRepository productRepository;
    private final PricingService pricingService;

    @Transactional
    public int revalidatePrices(UUID userId, UUID categoryId) {
        Category category = categoryService.findEntity(userId, categoryId);
        CategoryParameters parameters = categoryService.resolveParameters(category);

        if (parameters.targetProfitMargin() == null) {
            throw new InvalidRequestException(
                    "A categoria não possui margem de lucro definida (nem herdada) para reavaliação de preços.");
        }

        List<Product> products = productRepository.findByCategoryIdAndUserIdAndActiveTrue(categoryId, userId);
        int updated = 0;

        for (Product product : products) {
            PricingRequest request = PricingRequest.builder()
                    .productId(product.getId())
                    .fixedCostPercent(BigDecimal.ZERO)
                    .variableCostPercent(BigDecimal.ZERO)
                    .includeFixedCosts(false)
                    .build();

            BigDecimal recalculated = pricingService.calculatePricing(request, userId).getMinimumSellingPrice();
            if (product.getSellingPrice() == null || product.getSellingPrice().compareTo(recalculated) != 0) {
                product.setSellingPrice(recalculated);
                updated++;
            }
        }

        return updated;
    }
}
