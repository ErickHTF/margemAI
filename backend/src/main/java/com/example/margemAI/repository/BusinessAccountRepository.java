package com.example.margemAI.repository;
import com.example.margemAI.model.BusinessAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface BusinessAccountRepository extends JpaRepository<BusinessAccount, UUID> {
    List<BusinessAccount> findByUserIdOrderByName(UUID userId);
    Optional<BusinessAccount> findByIdAndUserId(UUID id, UUID userId);
}
