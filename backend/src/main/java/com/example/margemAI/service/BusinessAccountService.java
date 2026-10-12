package com.example.margemAI.service;
import com.example.margemAI.dto.request.*;
import com.example.margemAI.dto.response.*;
import com.example.margemAI.model.*;
import com.example.margemAI.repository.*;
import com.example.margemAI.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.util.*;
@Service @RequiredArgsConstructor
@Transactional(readOnly = true)
public class BusinessAccountService {
    private final BusinessAccountRepository accounts;
    private final AccountMovementRepository movements;
    private final UserRepository users;

    public List<BusinessAccountResponse> list(UUID userId) {
        var entries = movements.findOwned(userId);
        return accounts.findByUserIdOrderByName(userId).stream().map(a -> {
            BigDecimal balance = a.getOpeningBalance();
            for (var m : entries) {
                if (a.getId().equals(m.getAccount().getId()))
                    balance = balance.add(m.getType() == AccountMovement.Type.APORTE ? m.getAmount() : m.getAmount().negate());
                if (m.getDestination() != null && a.getId().equals(m.getDestination().getId()))
                    balance = balance.add(m.getAmount());
            }
            return response(a, balance);
        }).toList();
    }
    @Transactional
    public BusinessAccountResponse create(UUID userId, BusinessAccountRequest r) {
        var a = accounts.save(BusinessAccount.builder().name(r.name().trim())
            .openingBalance(r.openingBalance().setScale(2, RoundingMode.HALF_UP)).openingDate(r.openingDate())
            .user(users.getReferenceById(userId)).build());
        return response(a, a.getOpeningBalance());
    }
    public List<AccountMovementResponse> history(UUID userId, UUID accountId) {
        if (accountId != null) owned(userId, accountId);
        return movements.findOwned(userId).stream()
            .filter(m -> accountId == null || accountId.equals(m.getAccount().getId()) ||
                (m.getDestination() != null && accountId.equals(m.getDestination().getId())))
            .map(this::response).toList();
    }
    @Transactional
    public AccountMovementResponse createMovement(UUID userId, AccountMovementRequest r) {
        var account = owned(userId, r.accountId());
        BusinessAccount destination = null;
        if (r.type() == AccountMovement.Type.TRANSFERENCIA) {
            if (r.destinationId() == null || r.accountId().equals(r.destinationId()))
                throw new InvalidRequestException("Escolha uma conta de destino diferente da origem.");
            destination = owned(userId, r.destinationId());
        } else if (r.destinationId() != null) {
            throw new InvalidRequestException("Destino só é permitido em transferências.");
        }
        if (r.date().isBefore(account.getOpeningDate()) ||
            (destination != null && r.date().isBefore(destination.getOpeningDate())))
            throw new InvalidRequestException("O movimento não pode ser anterior ao saldo inicial das contas.");
        // Pró-labore é desembolso: o custo continua exclusivamente no módulo de custos.
        return response(movements.save(AccountMovement.builder().account(account).destination(destination)
            .type(r.type()).amount(r.amount().setScale(2, RoundingMode.HALF_UP))
            .date(r.date()).description(r.description().trim()).build()));
    }
    private BusinessAccount owned(UUID userId, UUID id) {
        return accounts.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Conta empresarial não encontrada."));
    }
    private BusinessAccountResponse response(BusinessAccount a, BigDecimal balance) {
        return new BusinessAccountResponse(a.getId(), a.getName(), a.getOpeningBalance(), a.getOpeningDate(), balance.setScale(2, RoundingMode.HALF_UP));
    }
    private AccountMovementResponse response(AccountMovement m) {
        return new AccountMovementResponse(m.getId(), m.getAccount().getId(), m.getDestination() == null ? null : m.getDestination().getId(), m.getType(), m.getAmount(), m.getDate(), m.getDescription());
    }
}
