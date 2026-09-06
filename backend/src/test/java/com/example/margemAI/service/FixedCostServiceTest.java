package com.example.margemAI.service;

import com.example.margemAI.dto.request.FixedCostRequest;
import com.example.margemAI.dto.response.FixedCostResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.FixedCost;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.FixedCostRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class FixedCostServiceTest {

    @Mock
    private FixedCostRepository fixedCostRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FixedCostService fixedCostService;

    private UUID userId;
    private FixedCost rentCost;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        rentCost = FixedCost.builder()
                .id(UUID.randomUUID())
                .name("Aluguel do ponto")
                .amount(new BigDecimal("1500.00"))
                .category(FixedCostCategory.ALUGUEL)
                .dueDate(LocalDate.of(2026, 7, 5))
                .recurring(true)
                .active(true)
                .createdAt(LocalDateTime.of(2026, 6, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 6, 1, 10, 0))
                .build();
    }

    @Test
    void shouldCreateFixedCostWithDefaultRecurringTrue() {
        FixedCostRequest request = FixedCostRequest.builder()
                .name("  DAS MEI  ")
                .amount(new BigDecimal("81.90"))
                .category(FixedCostCategory.DAS_MEI)
                .build();

        FixedCost cost = FixedCost.builder()
                .id(UUID.randomUUID())
                .name("DAS MEI")
                .amount(new BigDecimal("81.90"))
                .category(FixedCostCategory.DAS_MEI)
                .recurring(true)
                .active(true)
                .build();

        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(fixedCostRepository.save(any(FixedCost.class))).thenReturn(cost);

        FixedCostResponse response = fixedCostService.create(userId, request);

        ArgumentCaptor<FixedCost> captor = ArgumentCaptor.forClass(FixedCost.class);
        verify(fixedCostRepository).save(captor.capture());
        FixedCost saved = captor.getValue();
        assertEquals("DAS MEI", saved.getName());
        assertEquals(new BigDecimal("81.90"), saved.getAmount());
        assertEquals(FixedCostCategory.DAS_MEI, saved.getCategory());
        assertTrue(saved.getRecurring());
        assertTrue(saved.getActive());
        assertEquals(userId, saved.getUser().getId());

        assertEquals("DAS MEI", response.getName());
        assertEquals(FixedCostCategory.DAS_MEI, response.getCategory());
    }

    @Test
    void shouldRejectCreateWithoutCategory() {
        FixedCostRequest request = FixedCostRequest.builder()
                .name("Internet")
                .amount(new BigDecimal("120.00"))
                .build();

        assertThrows(InvalidRequestException.class, () -> fixedCostService.create(userId, request));
    }

    @Test
    void shouldRejectCreateWithBlankName() {
        FixedCostRequest request = FixedCostRequest.builder()
                .name("   ")
                .amount(new BigDecimal("120.00"))
                .category(FixedCostCategory.INTERNET)
                .build();

        assertThrows(InvalidRequestException.class, () -> fixedCostService.create(userId, request));
    }

    @Test
    void shouldListActiveFixedCostsOfUser() {
        FixedCost internet = FixedCost.builder()
                .id(UUID.randomUUID())
                .name("Internet")
                .amount(new BigDecimal("120.00"))
                .category(FixedCostCategory.INTERNET)
                .recurring(true)
                .active(true)
                .build();

        Page<FixedCost> page = new PageImpl<>(List.of(rentCost, internet), PageRequest.of(0, 20), 2);
        when(fixedCostRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var result = fixedCostService.findAll(userId, null, null, 0, 20);

        assertEquals(2, result.getContent().size());
        assertEquals(0, result.getPage());
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().anyMatch(c -> c.getCategory() == FixedCostCategory.ALUGUEL));
        assertTrue(result.getContent().stream().anyMatch(c -> c.getCategory() == FixedCostCategory.INTERNET));
    }

    @Test
    void shouldListOnlyRequestedCategory() {
        when(fixedCostRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(rentCost), PageRequest.of(0, 20), 1));

        var result = fixedCostService.findAll(userId, null, FixedCostCategory.ALUGUEL, 0, 20);

        assertEquals(1, result.getContent().size());
        assertEquals(FixedCostCategory.ALUGUEL, result.getContent().get(0).getCategory());
    }

    @Test
    void shouldRejectInvalidMonthFormat() {
        assertThrows(InvalidRequestException.class,
                () -> fixedCostService.findAll(userId, "07-2026", null, 0, 20));
    }

    @Test
    void shouldReturnFixedCostById() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        FixedCostResponse response = fixedCostService.findById(userId, rentCost.getId());

        assertEquals(rentCost.getId(), response.getId());
        assertEquals("Aluguel do ponto", response.getName());
    }

    @Test
    void shouldThrowNotFoundWhenFixedCostDoesNotExist() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), eq(userId)))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> fixedCostService.findById(userId, UUID.randomUUID()));
    }

    @Test
    void shouldNotReturnFixedCostBelongingToAnotherUser() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> fixedCostService.findById(userId, rentCost.getId()));
    }

    @Test
    void shouldFullyUpdateFixedCost() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        FixedCostRequest request = FixedCostRequest.builder()
                .name("Pró-labore")
                .amount(new BigDecimal("3000.00"))
                .category(FixedCostCategory.PRO_LABORE)
                .build();

        FixedCostResponse response = fixedCostService.update(userId, rentCost.getId(), request);

        assertEquals("Pró-labore", response.getName());
        assertEquals(new BigDecimal("3000.00"), response.getAmount());
        assertEquals(FixedCostCategory.PRO_LABORE, response.getCategory());
    }

    @Test
    void shouldRejectFullUpdateWhenAmountIsMissing() {
        FixedCostRequest request = FixedCostRequest.builder()
                .name("Energia")
                .category(FixedCostCategory.ENERGIA)
                .build();

        assertThrows(InvalidRequestException.class,
                () -> fixedCostService.update(userId, rentCost.getId(), request));
    }

    @Test
    void shouldPatchOnlyName() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        FixedCostRequest request = FixedCostRequest.builder().name("  Novo aluguel  ").build();

        FixedCostResponse response = fixedCostService.patch(userId, rentCost.getId(), request);

        assertEquals("Novo aluguel", response.getName());
        assertEquals(new BigDecimal("1500.00"), response.getAmount());
        assertEquals(FixedCostCategory.ALUGUEL, response.getCategory());
    }

    @Test
    void shouldPatchOnlyAmount() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        FixedCostRequest request = FixedCostRequest.builder()
                .amount(new BigDecimal("1700.00"))
                .build();

        FixedCostResponse response = fixedCostService.patch(userId, rentCost.getId(), request);

        assertEquals("Aluguel do ponto", response.getName());
        assertEquals(new BigDecimal("1700.00"), response.getAmount());
    }

    @Test
    void shouldRejectPatchWithBlankName() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        FixedCostRequest request = FixedCostRequest.builder()
                .name("   ")
                .build();

        assertThrows(InvalidRequestException.class,
                () -> fixedCostService.patch(userId, rentCost.getId(), request));
    }

    @Test
    void shouldClearDueDateOnFullUpdate() {
        when(fixedCostRepository.findByIdAndUserIdAndActiveTrue(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        FixedCostRequest request = FixedCostRequest.builder()
                .name("Aluguel do ponto")
                .amount(new BigDecimal("1500.00"))
                .category(FixedCostCategory.ALUGUEL)
                .dueDate(null)
                .build();

        FixedCostResponse response = fixedCostService.update(userId, rentCost.getId(), request);

        assertEquals("Aluguel do ponto", response.getName());
        assertEquals(null, response.getDueDate());
    }

    @Test
    void shouldSoftDeleteFixedCost() {
        when(fixedCostRepository.findByIdAndUserId(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        fixedCostService.delete(userId, rentCost.getId());

        assertFalse(rentCost.getActive());
    }

    @Test
    void shouldKeepDeletedCostInactiveOnRepeatedDelete() {
        rentCost.setActive(false);
        when(fixedCostRepository.findByIdAndUserId(rentCost.getId(), userId))
                .thenReturn(Optional.of(rentCost));

        fixedCostService.delete(userId, rentCost.getId());

        assertFalse(rentCost.getActive());
    }

    @Test
    void shouldThrowNotFoundWhenDeletingCostOfAnotherUser() {
        when(fixedCostRepository.findByIdAndUserId(rentCost.getId(), userId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> fixedCostService.delete(userId, rentCost.getId()));
    }

    @Test
    void shouldRejectNegativePageOnListing() {
        assertThrows(InvalidRequestException.class,
                () -> fixedCostService.findAll(userId, null, null, -1, 20));
    }

    @Test
    void shouldRejectZeroSizeOnListing() {
        assertThrows(InvalidRequestException.class,
                () -> fixedCostService.findAll(userId, null, null, 0, 0));
    }

    @Test
    void shouldRejectSizeAboveMaxOnListing() {
        assertThrows(InvalidRequestException.class,
                () -> fixedCostService.findAll(userId, null, null, 0, 101));
    }
}
