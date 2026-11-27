package com.example.margemAI.service;
import com.example.margemAI.dto.request.AccountMovementRequest;
import com.example.margemAI.exception.*;
import com.example.margemAI.model.*;
import com.example.margemAI.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
@ExtendWith(MockitoExtension.class)
class BusinessAccountServiceTest {
    @Mock BusinessAccountRepository accounts;
    @Mock AccountMovementRepository movements;
    @Mock UserRepository users;
    @InjectMocks BusinessAccountService service;
    UUID user = UUID.randomUUID();
    BusinessAccount account(String balance) {
        return BusinessAccount.builder().id(UUID.randomUUID()).openingBalance(new BigDecimal(balance))
            .openingDate(LocalDate.of(2026, 1, 1)).name("Conta").build();
    }
    AccountMovement entry(BusinessAccount a, BusinessAccount b, AccountMovement.Type type, String amount) {
        return AccountMovement.builder().id(UUID.randomUUID()).account(a).destination(b).type(type).amount(new BigDecimal(amount)).date(LocalDate.of(2026, 2, 1)).description("Movimento").build();
    }
    @Test @DisplayName("Soma aportes e desconta retiradas e pró-labore sem duplicar transferências")
    void balances() {
        var a = account("100.00"); var b = account("20.00");
        when(accounts.findByUserIdOrderByName(user)).thenReturn(List.of(a, b));
        when(movements.findOwned(user)).thenReturn(List.of(entry(a,null,AccountMovement.Type.APORTE,"50"), entry(a,null,AccountMovement.Type.RETIRADA,"10"), entry(a,null,AccountMovement.Type.PRO_LABORE,"15"), entry(a,b,AccountMovement.Type.TRANSFERENCIA,"25")));
        var result = service.list(user);
        assertEquals(new BigDecimal("100.00"), result.get(0).balance());
        assertEquals(new BigDecimal("45.00"), result.get(1).balance());
    }
    @Test @DisplayName("Filtro da conta destino inclui a transferência recebida")
    void filterDestination() {
        var a = account("0"); var b = account("0");
        when(accounts.findByIdAndUserId(b.getId(), user)).thenReturn(Optional.of(b));
        when(movements.findOwned(user)).thenReturn(List.of(entry(a,b,AccountMovement.Type.TRANSFERENCIA,"25"), entry(a,null,AccountMovement.Type.APORTE,"10")));
        assertEquals(1, service.history(user,b.getId()).size());
    }
    AccountMovementRequest request(BusinessAccount a, UUID destination, LocalDate date) {
        return new AccountMovementRequest(a.getId(), destination, AccountMovement.Type.TRANSFERENCIA,new BigDecimal("10"),date,"Transferência");
    }
    @Test @DisplayName("Impede transferência para conta de outro titular sem gravar movimento")
    void foreignDestination() {
        var a = account("0"); var other = UUID.randomUUID();
        when(accounts.findByIdAndUserId(a.getId(),user)).thenReturn(Optional.of(a));
        when(accounts.findByIdAndUserId(other,user)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.createMovement(user,request(a,other,LocalDate.now())));
        verifyNoInteractions(movements);
    }
    @Test @DisplayName("Impede consultar histórico de conta de outro titular")
    void foreignHistory() {
        assertThrows(ResourceNotFoundException.class, () -> service.history(user,UUID.randomUUID()));
        verifyNoInteractions(movements);
    }
    @Test @DisplayName("Impede transferência para a própria conta")
    void sameAccount() {
        var a = account("0");
        when(accounts.findByIdAndUserId(a.getId(),user)).thenReturn(Optional.of(a));
        assertThrows(InvalidRequestException.class, () -> service.createMovement(user,request(a,a.getId(),LocalDate.now())));
        verifyNoInteractions(movements);
    }
    @Test @DisplayName("Impede movimento anterior ao saldo inicial do destino")
    void beforeOpening() {
        var a = account("0"); var b = account("0"); b.setOpeningDate(LocalDate.now());
        when(accounts.findByIdAndUserId(a.getId(),user)).thenReturn(Optional.of(a));
        when(accounts.findByIdAndUserId(b.getId(),user)).thenReturn(Optional.of(b));
        assertThrows(InvalidRequestException.class, () -> service.createMovement(user,request(a,b.getId(),LocalDate.of(2026,2,1))));
        verifyNoInteractions(movements);
    }
    @Test @DisplayName("Grava transferência em uma única operação com escala monetária")
    void transfer() {
        var a = account("0"); var b = account("0");
        when(accounts.findByIdAndUserId(a.getId(),user)).thenReturn(Optional.of(a));
        when(accounts.findByIdAndUserId(b.getId(),user)).thenReturn(Optional.of(b));
        when(movements.save(any())).thenAnswer(i -> i.getArgument(0));
        var result = service.createMovement(user,request(a,b.getId(),LocalDate.now()));
        assertEquals(new BigDecimal("10.00"),result.amount());
        assertEquals(b.getId(),result.destinationId());
        verify(movements,times(1)).save(any());
        verifyNoInteractions(users);
    }
}
