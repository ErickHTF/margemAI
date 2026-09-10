package com.example.margemAI.service;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PricingService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    public PricingResponse calculatePricing(PricingRequest request) {
        if (request.getBaseCost() == null) {
            throw new InvalidFinancialCalculationException("O custo base do produto ou serviço é obrigatório.");
        }

        BigDecimal baseCost = request.getBaseCost();
        BigDecimal fixedPercent = (request.getIncludeFixedCosts() != null && request.getIncludeFixedCosts())
                ? (request.getFixedCostPercent() != null ? request.getFixedCostPercent() : BigDecimal.ZERO)
                : BigDecimal.ZERO;
        BigDecimal varPercent = request.getVariableCostPercent() != null ? request.getVariableCostPercent() : BigDecimal.ZERO;
        BigDecimal desiredMargin = request.getDesiredMargin() != null ? request.getDesiredMargin() : BigDecimal.ZERO;

        BigDecimal sumPercentages = fixedPercent.add(varPercent).add(desiredMargin);

        if (sumPercentages.compareTo(ONE_HUNDRED) >= 0) {
            throw new InvalidFinancialCalculationException(
                    "A soma dos percentuais de custos fixos (" + fixedPercent + "%), custos variáveis (" + varPercent
                            + "%) e margem desejada (" + desiredMargin + "%) totaliza " + sumPercentages
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

        BigDecimal estimatedTaxes = BigDecimal.ZERO;

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
                .productId(request.getProductId())
                .productName(null)
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
