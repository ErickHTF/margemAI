package com.example.margemAI.repository;
import com.example.margemAI.model.AccountMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface AccountMovementRepository extends JpaRepository<AccountMovement, UUID> {
    @Query("select m from AccountMovement m where m.account.user.id = :userId order by m.date desc, m.id desc")
    List<AccountMovement> findOwned(@Param("userId") UUID userId);
}
