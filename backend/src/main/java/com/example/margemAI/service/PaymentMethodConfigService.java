package com.example.margemAI.service;

import com.example.margemAI.dto.request.PaymentMethodConfigRequest;
import com.example.margemAI.dto.response.PaymentMethodConfigResponse;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.PaymentMethodConfigRepository;
import com.example.margemAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaymentMethodConfigService {

    private final PaymentMethodConfigRepository configRepository;
    private final UserRepository userRepository;

    private static final BigDecimal INSTALLMENT_STEP_FEE = new BigDecimal("1.00");

    @Transactional(readOnly = true)
    public List<PaymentMethodConfigResponse> getMatrixForUser(UUID userId) {
        List<PaymentMethodConfig> savedConfigs = configRepository
                .findByUserIdOrderByPaymentMethodAscInstallmentsAsc(userId);

        Map<String, PaymentMethodConfig> savedMap = savedConfigs.stream()
                .collect(Collectors.toMap(
                        c -> buildKey(c.getPaymentMethod(), c.getInstallments()),
                        c -> c,
                        (existing, replacement) -> existing
                ));

        List<PaymentMethodConfigResponse> matrix = new ArrayList<>();

        // 1. Dinheiro
        matrix.add(buildResponseItem(savedMap, PaymentMethod.DINHEIRO, 1,
                PaymentMethod.DINHEIRO.getDefaultFeePercentage(), BigDecimal.ZERO, 0));

        // 2. Pix
        matrix.add(buildResponseItem(savedMap, PaymentMethod.PIX, 1,
                PaymentMethod.PIX.getDefaultFeePercentage(), BigDecimal.ZERO, 0));

        // 3. Débito
        matrix.add(buildResponseItem(savedMap, PaymentMethod.DEBITO, 1,
                PaymentMethod.DEBITO.getDefaultFeePercentage(), BigDecimal.ZERO, 1));

        // 4. Crédito à Vista
        matrix.add(buildResponseItem(savedMap, PaymentMethod.CREDITO_A_VISTA, 1,
                PaymentMethod.CREDITO_A_VISTA.getDefaultFeePercentage(), BigDecimal.ZERO, 30));

        // 5. Crédito Parcelado (2x até 12x)
        for (int i = 2; i <= 12; i++) {
            BigDecimal defaultMdr = PaymentMethod.CREDITO_PARCELADO.getDefaultFeePercentage()
                    .add(INSTALLMENT_STEP_FEE.multiply(BigDecimal.valueOf(i - 1L)))
                    .setScale(2, RoundingMode.HALF_UP);

            matrix.add(buildResponseItem(savedMap, PaymentMethod.CREDITO_PARCELADO, i,
                    defaultMdr, BigDecimal.ZERO, 30));
        }

        return matrix;
    }

    @Transactional
    public List<PaymentMethodConfigResponse> updateMatrix(UUID userId, List<PaymentMethodConfigRequest> requests) {
        if (requests == null || requests.isEmpty()) {
            throw new IllegalArgumentException("A lista de configurações não pode estar vazia.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        for (PaymentMethodConfigRequest req : requests) {
            int installments = req.getPaymentMethod() == PaymentMethod.CREDITO_PARCELADO
                    ? Math.max(2, req.getInstallments() != null ? req.getInstallments() : 2)
                    : 1;

            Optional<PaymentMethodConfig> existingOpt = configRepository
                    .findByUserIdAndPaymentMethodAndInstallments(userId, req.getPaymentMethod(), installments);

            PaymentMethodConfig config;
            if (existingOpt.isPresent()) {
                config = existingOpt.get();
                config.setMdrFeePercent(req.getMdrFeePercent().setScale(2, RoundingMode.HALF_UP));
                config.setFixedFeeAmount(req.getFixedFeeAmount() != null
                        ? req.getFixedFeeAmount().setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO);
                config.setSettlementDays(req.getSettlementDays() != null ? req.getSettlementDays() : 0);
                config.setIsActive(req.getIsActive() != null ? req.getIsActive() : true);
            } else {
                config = PaymentMethodConfig.builder()
                        .user(user)
                        .paymentMethod(req.getPaymentMethod())
                        .installments(installments)
                        .mdrFeePercent(req.getMdrFeePercent().setScale(2, RoundingMode.HALF_UP))
                        .fixedFeeAmount(req.getFixedFeeAmount() != null
                                ? req.getFixedFeeAmount().setScale(2, RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .settlementDays(req.getSettlementDays() != null ? req.getSettlementDays() : 0)
                        .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                        .build();
            }
            configRepository.save(config);
        }

        return getMatrixForUser(userId);
    }

    @Transactional(readOnly = true)
    public Optional<PaymentMethodConfig> resolveConfig(UUID userId, PaymentMethod paymentMethod, Integer installments) {
        if (userId == null || paymentMethod == null) {
            return Optional.empty();
        }
        int validInstallments = (paymentMethod == PaymentMethod.CREDITO_PARCELADO && installments != null && installments >= 2)
                ? installments
                : 1;

        return configRepository.findByUserIdAndPaymentMethodAndInstallments(userId, paymentMethod, validInstallments);
    }

    private PaymentMethodConfigResponse buildResponseItem(
            Map<String, PaymentMethodConfig> savedMap,
            PaymentMethod method,
            int installments,
            BigDecimal defaultMdr,
            BigDecimal defaultFixedFee,
            int defaultSettlementDays
    ) {
        String key = buildKey(method, installments);
        PaymentMethodConfig saved = savedMap.get(key);

        PaymentMethodConfigResponse.PaymentMethodConfigResponseBuilder builder = PaymentMethodConfigResponse.builder()
                .paymentMethod(method)
                .description(formatDescription(method, installments))
                .installments(installments)
                .defaultMdrFeePercent(defaultMdr)
                .defaultFixedFeeAmount(defaultFixedFee)
                .defaultSettlementDays(defaultSettlementDays);

        if (saved != null) {
            return builder
                    .id(saved.getId())
                    .mdrFeePercent(saved.getMdrFeePercent())
                    .fixedFeeAmount(saved.getFixedFeeAmount())
                    .settlementDays(saved.getSettlementDays())
                    .isActive(saved.getIsActive())
                    .isCustomized(differsFromDefault(saved, defaultMdr, defaultFixedFee, defaultSettlementDays))
                    .build();
        }

        return builder
                .id(null)
                .mdrFeePercent(defaultMdr)
                .fixedFeeAmount(defaultFixedFee)
                .settlementDays(defaultSettlementDays)
                .isActive(true)
                .isCustomized(false)
                .build();
    }

    // Um registro salvo só é "personalizado" se algum valor divergir do padrão recomendado
    private boolean differsFromDefault(
            PaymentMethodConfig saved,
            BigDecimal defaultMdr,
            BigDecimal defaultFixedFee,
            int defaultSettlementDays
    ) {
        return !sameAmount(saved.getMdrFeePercent(), defaultMdr)
                || !sameAmount(saved.getFixedFeeAmount(), defaultFixedFee)
                || !Integer.valueOf(defaultSettlementDays).equals(saved.getSettlementDays());
    }

    private boolean sameAmount(BigDecimal value, BigDecimal reference) {
        BigDecimal safeValue = value != null ? value : BigDecimal.ZERO;
        return safeValue.compareTo(reference) == 0;
    }

    private String formatDescription(PaymentMethod method, int installments) {
        if (method == PaymentMethod.CREDITO_PARCELADO) {
            return "Crédito Parcelado (" + installments + "x)";
        }
        return method.getDescription();
    }

    private String buildKey(PaymentMethod method, int installments) {
        return method.name() + "_" + installments;
    }
}
