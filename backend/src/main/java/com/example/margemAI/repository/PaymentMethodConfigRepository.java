package com.example.margemAI.repository;

import com.example.margemAI.model.PaymentMethod;
import com.example.margemAI.model.PaymentMethodConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentMethodConfigRepository extends JpaRepository<PaymentMethodConfig, UUID> {

    List<PaymentMethodConfig> findByUserIdOrderByPaymentMethodAscInstallmentsAsc(UUID userId);

    Optional<PaymentMethodConfig> findByUserIdAndPaymentMethodAndInstallments(
            UUID userId,
            PaymentMethod paymentMethod,
            Integer installments
    );

    void deleteByUserId(UUID userId);
}
