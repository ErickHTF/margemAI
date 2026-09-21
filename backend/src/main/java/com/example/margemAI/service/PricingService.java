package com.example.margemAI.service;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.VariableCostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class PricingService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);
    private final ProductRepository productRepository;
    private final VariableCostRepository variableCostRepository;
    private final CategoryService categoryService;
    private final FixedCostProfileService fixedCostProfileService;

    @Transactional(readOnly = true)
    public PricingResponse calculatePricing(PricingRequest request, UUID userId) {
        BigDecimal baseCost;
        String productName = null;
        UUID productId = request.getProductId();
        CategoryParameters inheritedParameters = null;

        if (productId != null) {
            Product product = productRepository.findByIdAndUserIdAndActiveTrue(productId, userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto ou serviço não encontrado."));
            baseCost = resolveEffectiveBaseCost(product, userId);
            productName = product.getName();
            if (product.getCategory() != null) {
                inheritedParameters = categoryService.resolveParameters(product.getCategory());
            }
        } else {
            if (request.getBaseCost() == null) {
                throw new InvalidFinancialCalculationException("O custo base do produto ou serviço é obrigatório.");
            }
            baseCost = request.getBaseCost();
        }

        BigDecimal fixedPercent = resolveFixedPercent(request, userId);
        BigDecimal varPercent = request.getVariableCostPercent() != null ? request.getVariableCostPercent() : BigDecimal.ZERO;
        BigDecimal desiredMargin = resolvePercent(request.getDesiredMargin(), inheritedParameters, CategoryParameters::targetProfitMargin);
        BigDecimal taxPercent = resolvePercent(request.getTaxRate(), inheritedParameters, CategoryParameters::taxRate);

        BigDecimal sumPercentages = fixedPercent.add(varPercent).add(desiredMargin).add(taxPercent);

        if (sumPercentages.compareTo(ONE_HUNDRED) >= 0) {
            throw new InvalidFinancialCalculationException(
                    "A soma dos percentuais de custos fixos (" + fixedPercent + "%), custos variáveis (" + varPercent
                            + "%), margem desejada (" + desiredMargin + "%) e tributos (" + taxPercent + "%) totaliza "
                            + sumPercentages
                            + "%, que é igual ou superior a 100%. Pela metodologia SEBRAE, a soma deve ser estritamente inferior a 100%."
            );
        }

        BigDecimal markupDenominator = ONE_HUNDRED.subtract(sumPercentages);

        BigDecimal markupMultiplier = ONE_HUNDRED
                .divide(markupDenominator, 4, RoundingMode.HALF_UP);

        BigDecimal minimumSellingPrice = baseCost
                .multiply(ONE_HUNDRED)
                .divide(markupDenominator, 2, RoundingMode.HALF_UP);

        BigDecimal allocatedFixedCosts = minimumSellingPrice
                .multiply(fixedPercent)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);

        BigDecimal totalVariableCosts = minimumSellingPrice
                .multiply(varPercent)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);

        BigDecimal estimatedTaxes = minimumSellingPrice
                .multiply(taxPercent)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);

        BigDecimal totalUnitCost = baseCost
                .add(allocatedFixedCosts)
                .add(totalVariableCosts);

        BigDecimal unitProfit = minimumSellingPrice
                .subtract(totalUnitCost);

        BigDecimal grossMargin = minimumSellingPrice.compareTo(BigDecimal.ZERO) > 0
                ? minimumSellingPrice.subtract(baseCost).multiply(ONE_HUNDRED).divide(minimumSellingPrice, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal contributionMargin = minimumSellingPrice
                .subtract(baseCost.add(totalVariableCosts));

        return PricingResponse.builder()
                .productId(productId)
                .productName(productName)
                .baseCost(baseCost.setScale(2, RoundingMode.HALF_UP))
                .totalVariableCosts(totalVariableCosts)
                .allocatedFixedCosts(allocatedFixedCosts)
                .estimatedTaxes(estimatedTaxes)
                .totalUnitCost(totalUnitCost)
                .desiredMargin(desiredMargin.setScale(2, RoundingMode.HALF_UP))
                .minimumSellingPrice(minimumSellingPrice)
                .markup(markupMultiplier.setScale(2, RoundingMode.HALF_UP))
                .unitProfit(unitProfit)
                .grossMargin(grossMargin)
                .contributionMargin(contributionMargin)
                .build();
    }

    private BigDecimal resolveEffectiveBaseCost(Product product, UUID userId) {
        BigDecimal manualBase = product.getBaseCost() != null ? product.getBaseCost() : BigDecimal.ZERO;
        List<VariableCost> variableCosts = variableCostRepository
                .findByProductIdAndUserIdAndActiveTrue(product.getId(), userId);
        BigDecimal variableCostsTotal = variableCosts.stream()
                .map(VariableCost::getUnitAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return variableCostsTotal.compareTo(BigDecimal.ZERO) > 0 ? variableCostsTotal : manualBase;
    }

    private BigDecimal resolveFixedPercent(PricingRequest request, UUID userId) {
        if (request.getIncludeFixedCosts() == null || !request.getIncludeFixedCosts()) {
            return BigDecimal.ZERO;
        }
        if (Boolean.TRUE.equals(request.getUseAutomaticFixedCosts())) {
            return fixedCostProfileService.getEffectiveFixedCostPercent(userId);
        }
        return request.getFixedCostPercent() != null ? request.getFixedCostPercent() : BigDecimal.ZERO;
    }

    private BigDecimal resolvePercent(
            BigDecimal explicitValue,
            CategoryParameters inheritedParameters,
            Function<CategoryParameters, BigDecimal> extractor) {
        if (explicitValue != null) {
            return explicitValue;
        }
        if (inheritedParameters != null) {
            BigDecimal inherited = extractor.apply(inheritedParameters);
            if (inherited != null) {
                return inherited;
            }
        }
        return BigDecimal.ZERO;
    }

    public SimulateDiscountResponse simulateDiscount(SimulateDiscountRequest request) {
        BigDecimal sellingPrice = request.getSellingPrice();
        BigDecimal discountPercentage = request.getDiscountPercentage();

        BigDecimal discountAmount = sellingPrice
                .multiply(discountPercentage)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);

        BigDecimal discountedPrice = sellingPrice.subtract(discountAmount);

        BigDecimal baseCost = request.getBaseCost() != null ? request.getBaseCost() : BigDecimal.ZERO;
        BigDecimal fixedPercent = request.getFixedCostPercent() != null ? request.getFixedCostPercent() : BigDecimal.ZERO;
        BigDecimal varPercent = request.getVariableCostPercent() != null ? request.getVariableCostPercent() : BigDecimal.ZERO;

        BigDecimal totalPercentages = fixedPercent.add(varPercent);

        BigDecimal originalAllocatedCosts = sellingPrice
                .multiply(totalPercentages)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        BigDecimal originalTotalCost = baseCost.add(originalAllocatedCosts);
        BigDecimal originalProfit = sellingPrice.subtract(originalTotalCost);
        BigDecimal originalMargin = sellingPrice.compareTo(BigDecimal.ZERO) > 0
                ? originalProfit.multiply(ONE_HUNDRED).divide(sellingPrice, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal discountedAllocatedCosts = discountedPrice
                .multiply(totalPercentages)
                .divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
        BigDecimal discountedTotalCost = baseCost.add(discountedAllocatedCosts);
        BigDecimal discountedProfit = discountedPrice.subtract(discountedTotalCost);
        BigDecimal discountedMargin = discountedPrice.compareTo(BigDecimal.ZERO) > 0
                ? discountedProfit.multiply(ONE_HUNDRED).divide(discountedPrice, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        boolean viable = discountedProfit.compareTo(BigDecimal.ZERO) > 0;

        String recommendation;
        if (!viable) {
            recommendation = "Alerta SEBRAE: O desconto aplicado de " + discountPercentage + "% resulta em prejuízo financeiro. Não recomendado para a saúde do seu negócio.";
        } else if (discountedMargin.compareTo(BigDecimal.valueOf(10)) < 0) {
            BigDecimal suggestedMaxDiscount = discountPercentage.divide(BigDecimal.valueOf(2), 0, RoundingMode.DOWN);
            recommendation = "Atenção SEBRAE: O desconto reduz drasticamente sua margem de lucro (" + discountedMargin + "%). Considere limitar o desconto a no máximo " + suggestedMaxDiscount + "%.";
        } else {
            recommendation = "Operação recomendada: O preço com desconto permanece saudável, gerando lucro de R$ " + discountedProfit + " com margem de " + discountedMargin + "%.";
        }

        return SimulateDiscountResponse.builder()
                .originalPrice(sellingPrice.setScale(2, RoundingMode.HALF_UP))
                .discount(discountAmount)
                .discountedPrice(discountedPrice)
                .totalCost(discountedTotalCost)
                .originalProfit(originalProfit)
                .discountedProfit(discountedProfit)
                .originalMargin(originalMargin)
                .discountedMargin(discountedMargin)
                .viable(viable)
                .recommendation(recommendation)
                .build();
    }
}
