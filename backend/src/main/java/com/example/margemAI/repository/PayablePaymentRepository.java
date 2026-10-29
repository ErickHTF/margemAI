package com.example.margemAI.repository;

import com.example.margemAI.model.PayablePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PayablePaymentRepository extends JpaRepository<PayablePayment, UUID> {

    List<PayablePayment> findByPayableIdOrderByPaidAtAsc(UUID payableId);

    List<PayablePayment> findByPayableIdInOrderByPaidAtAsc(Collection<UUID> payableIds);

    @Query("select coalesce(sum(p.amount), 0) from PayablePayment p "
            + "where p.user.id = :userId and p.reversedAt is null and p.paidAt >= :start and p.paidAt < :end")
    BigDecimal sumActiveAmountByUserIdAndPaidAtBetween(
            @Param("userId") UUID userId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );

    @Modifying
    @Query("delete from PayablePayment p where p.payable.id = :payableId")
    void deleteByPayableId(@Param("payableId") UUID payableId);
}
