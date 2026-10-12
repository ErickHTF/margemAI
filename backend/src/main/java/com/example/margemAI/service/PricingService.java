package com.example.margemAI.service;

import com.example.margemAI.dto.request.BreakEvenRequest;
import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.BreakEvenResponse;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Product;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.repository.ProductRepository;
import com.example.margemAI.repository.VariableCostRepository;
import com.example.margemAI.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.List;
import java.util.Locale;
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
        BigDecimal varPercent = resolvePercent(request.getVariableCostPercent(), inheritedParameters, CategoryParameters::variableCostPercent);
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

        BigDecimal allocatedFixedCosts = Money.percentOf(minimumSellingPrice, fixedPercent);

        BigDecimal totalVariableCosts = Money.percentOf(minimumSellingPrice, varPercent);

        BigDecimal estimatedTaxes = Money.percentOf(minimumSellingPrice, taxPercent);

        BigDecimal totalUnitCost = baseCost
                .add(allocatedFixedCosts)
                .add(totalVariableCosts);

        BigDecimal unitProfit = minimumSellingPrice
                .subtract(totalUnitCost);

        BigDecimal grossMargin = minimumSellingPrice.compareTo(BigDecimal.ZERO) > 0
                ? Money.percentageOf(minimumSellingPrice.subtract(baseCost), minimumSellingPrice)
                : BigDecimal.ZERO;

        BigDecimal contributionMargin = minimumSellingPrice
                .subtract(baseCost.add(totalVariableCosts));

        return PricingResponse.builder()
                .productId(productId)
                .productName(productName)
                .baseCost(Money.round(baseCost))
                .totalVariableCosts(totalVariableCosts)
                .allocatedFixedCosts(allocatedFixedCosts)
                .estimatedTaxes(estimatedTaxes)
                .totalUnitCost(totalUnitCost)
                .desiredMargin(Money.round(desiredMargin))
                .minimumSellingPrice(minimumSellingPrice)
                .markup(Money.round(markupMultiplier))
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

        BigDecimal discountAmount = Money.percentOf(sellingPrice, discountPercentage);

        BigDecimal discountedPrice = sellingPrice.subtract(discountAmount);

        BigDecimal baseCost = request.getBaseCost() != null ? request.getBaseCost() : BigDecimal.ZERO;
        BigDecimal fixedPercent = request.getFixedCostPercent() != null ? request.getFixedCostPercent() : BigDecimal.ZERO;
        BigDecimal varPercent = request.getVariableCostPercent() != null ? request.getVariableCostPercent() : BigDecimal.ZERO;

        BigDecimal totalPercentages = fixedPercent.add(varPercent);

        BigDecimal originalAllocatedCosts = Money.percentOf(sellingPrice, totalPercentages);
        BigDecimal originalTotalCost = baseCost.add(originalAllocatedCosts);
        BigDecimal originalProfit = sellingPrice.subtract(originalTotalCost);
        BigDecimal originalMargin = sellingPrice.compareTo(BigDecimal.ZERO) > 0
                ? Money.percentageOf(originalProfit, sellingPrice)
                : BigDecimal.ZERO;

        BigDecimal discountedAllocatedCosts = Money.percentOf(discountedPrice, totalPercentages);
        BigDecimal discountedTotalCost = baseCost.add(discountedAllocatedCosts);
        BigDecimal discountedProfit = discountedPrice.subtract(discountedTotalCost);
        BigDecimal discountedMargin = discountedPrice.compareTo(BigDecimal.ZERO) > 0
                ? Money.percentageOf(discountedProfit, discountedPrice)
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
                .originalPrice(Money.round(sellingPrice))
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

    @Transactional(readOnly = true)
    public BreakEvenResponse calculateBreakEven(BreakEvenRequest request, UUID userId) {
        BigDecimal sellingPrice = request.getSellingPrice();
        BigDecimal unitVariableCost = request.getUnitVariableCost();

        if (request.getProductId() != null) {
            Product product = productRepository.findByIdAndUserIdAndActiveTrue(request.getProductId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Produto ou serviço não encontrado."));
            if (sellingPrice == null) {
                sellingPrice = product.getSellingPrice() != null ? product.getSellingPrice() : product.getBaseCost();
            }
            if (unitVariableCost == null) {
                unitVariableCost = resolveEffectiveBaseCost(product, userId);
            }
        }

        if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidFinancialCalculationException("O preço de venda unitário deve ser informado e superior a zero.");
        }

        if (unitVariableCost == null) {
            unitVariableCost = BigDecimal.ZERO;
        }

        BigDecimal totalFixedCosts = request.getTotalFixedCosts();
        if (totalFixedCosts == null) {
            totalFixedCosts = fixedCostProfileService.recalculate(userId).getTotalFixedCostsSnapshot();
            if (totalFixedCosts == null) {
                totalFixedCosts = BigDecimal.ZERO;
            }
        }

        BigDecimal unitContributionMargin = sellingPrice.subtract(unitVariableCost);
        boolean viable = unitContributionMargin.compareTo(BigDecimal.ZERO) > 0;

        BigDecimal contributionMarginRatio;
        Long breakEvenQuantity = 0L;
        BigDecimal breakEvenRevenue = BigDecimal.ZERO;
        String recommendation;

        if (!viable) {
            recommendation = "Alerta Crítico SEBRAE: O preço de venda (" + formatBrl(sellingPrice) + ") é menor ou igual ao custo variável unitário (" + formatBrl(unitVariableCost) + "). Cada unidade vendida gera prejuízo operacional direto. É impossível atingir o ponto de equilíbrio sem reajustar o preço ou reduzir custos.";
            contributionMarginRatio = sellingPrice.compareTo(BigDecimal.ZERO) > 0
                    ? Money.percentageOf(unitContributionMargin, sellingPrice)
                    : BigDecimal.ZERO;
        } else {
            contributionMarginRatio = Money.percentageOf(unitContributionMargin, sellingPrice);

            if (totalFixedCosts.compareTo(BigDecimal.ZERO) <= 0) {
                breakEvenQuantity = 0L;
                breakEvenRevenue = Money.ZERO;
                recommendation = "Ponto de equilíbrio zero: Nenhum custo fixo registrado. Qualquer venda já cobre a estrutura do negócio e gera lucro.";
            } else {
                BigDecimal rawQty = totalFixedCosts.divide(unitContributionMargin, 4, RoundingMode.CEILING);
                breakEvenQuantity = rawQty.setScale(0, RoundingMode.CEILING).longValue();

                BigDecimal marginRatioDecimal = unitContributionMargin.divide(sellingPrice, 6, RoundingMode.HALF_UP);
                breakEvenRevenue = totalFixedCosts.divide(marginRatioDecimal, 2, RoundingMode.HALF_UP);

                recommendation = "Diretriz SEBRAE: Você precisa faturar no mínimo " + formatBrl(breakEvenRevenue)
                        + " (aproximadamente " + breakEvenQuantity + " unidades) no mês para cobrir todos os seus custos e despesas fixas. A partir desse volume, o negócio passa a lucrar de verdade.";
            }
        }

        return BreakEvenResponse.builder()
                .sellingPrice(Money.round(sellingPrice))
                .unitVariableCost(Money.round(unitVariableCost))
                .totalFixedCosts(Money.round(totalFixedCosts))
                .unitContributionMargin(Money.round(unitContributionMargin))
                .contributionMarginRatio(contributionMarginRatio)
                .breakEvenQuantity(breakEvenQuantity)
                .breakEvenRevenue(breakEvenRevenue)
                .viable(viable)
                .recommendation(recommendation)
                .build();
    }

    private static String formatBrl(BigDecimal value) {
        return NumberFormat.getCurrencyInstance(Locale.of("pt", "BR"))
                .format(Money.round(value));
    }
}
