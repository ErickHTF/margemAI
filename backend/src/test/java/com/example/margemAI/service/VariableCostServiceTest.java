package com.example.margemAI.service;

import com.example.margemAI.dto.request.VariableCostRequest;
import com.example.margemAI.dto.response.VariableCostResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.VariableCost;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.repository.VariableCostRepository;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class VariableCostServiceTest {

    @Mock
    private VariableCostRepository variableCostRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private VariableCostService variableCostService;

    private UUID userId;
    private VariableCost fabricCost;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        fabricCost = VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Tecido")
                .unitAmount(new BigDecimal("25.50"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .active(true)
                .createdAt(LocalDateTime.of(2026, 6, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 6, 1, 10, 0))
                .build();
    }

    @Test
    void shouldCreateVariableCost() {
        UUID productId = UUID.randomUUID();
        VariableCostRequest request = VariableCostRequest.builder()
                .name("  Embalagem  ")
                .unitAmount(new BigDecimal("3.75"))
                .category(VariableCostCategory.EMBALAGEM)
                .productId(productId)
                .build();

        VariableCost cost = VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Embalagem")
                .unitAmount(new BigDecimal("3.75"))
                .category(VariableCostCategory.EMBALAGEM)
                .productId(productId)
                .active(true)
                .build();

        when(userRepository.getReferenceById(userId)).thenReturn(User.builder().id(userId).build());
        when(variableCostRepository.save(any(VariableCost.class))).thenReturn(cost);

        VariableCostResponse response = variableCostService.create(userId, request);

        ArgumentCaptor<VariableCost> captor = ArgumentCaptor.forClass(VariableCost.class);
        verify(variableCostRepository).save(captor.capture());
        VariableCost saved = captor.getValue();
        assertEquals("Embalagem", saved.getName());
        assertEquals(new BigDecimal("3.75"), saved.getUnitAmount());
        assertEquals(VariableCostCategory.EMBALAGEM, saved.getCategory());
        assertEquals(productId, saved.getProductId());
        assertTrue(saved.getActive());
        assertEquals(userId, saved.getUser().getId());

        assertEquals("Embalagem", response.getName());
        assertEquals(productId, response.getProductId());
    }

    @Test
    void shouldRejectCreateWithoutName() {
        VariableCostRequest request = VariableCostRequest.builder()
                .unitAmount(new BigDecimal("10.00"))
                .category(VariableCostCategory.OUTRO)
                .build();

        assertThrows(InvalidRequestException.class, () -> variableCostService.create(userId, request));
    }

    @Test
    void shouldRejectCreateWithoutCategory() {
        VariableCostRequest request = VariableCostRequest.builder()
                .name("Frete")
                .unitAmount(new BigDecimal("15.00"))
                .build();

        assertThrows(InvalidRequestException.class, () -> variableCostService.create(userId, request));
    }

    @Test
    void shouldListVariableCostsOfUser() {
        VariableCost freight = VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Frete")
                .unitAmount(new BigDecimal("15.00"))
                .category(VariableCostCategory.FRETE)
                .active(true)
                .build();

        Page<VariableCost> page = new PageImpl<>(List.of(fabricCost, freight), PageRequest.of(0, 20), 2);
        when(variableCostRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var result = variableCostService.findAll(userId, null, null, 0, 20);

        assertEquals(2, result.getContent().size());
        assertEquals(2, result.getTotalElements());
        assertTrue(result.getContent().stream().anyMatch(c -> c.getCategory() == VariableCostCategory.MATERIA_PRIMA));
        assertTrue(result.getContent().stream().anyMatch(c -> c.getCategory() == VariableCostCategory.FRETE));
    }

    @Test
    void shouldListVariableCostsFilteredByProduct() {
        UUID productId = UUID.randomUUID();
        when(variableCostRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(fabricCost), PageRequest.of(0, 20), 1));

        var result = variableCostService.findAll(userId, productId, null, 0, 20);

        assertEquals(1, result.getContent().size());
        assertEquals(VariableCostCategory.MATERIA_PRIMA, result.getContent().get(0).getCategory());
    }

    @Test
    void shouldListVariableCostsFilteredByCategory() {
        when(variableCostRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(fabricCost), PageRequest.of(0, 20), 1));

        var result = variableCostService.findAll(userId, null, VariableCostCategory.MATERIA_PRIMA, 0, 20);

        assertEquals(1, result.getContent().size());
        assertEquals(VariableCostCategory.MATERIA_PRIMA, result.getContent().get(0).getCategory());
    }

    @Test
    void shouldReturnVariableCostById() {
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));

        VariableCostResponse response = variableCostService.findById(userId, fabricCost.getId());

        assertEquals(fabricCost.getId(), response.getId());
        assertEquals("Tecido", response.getName());
    }

    @Test
    void shouldThrowNotFoundWhenVariableCostDoesNotExist() {
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(any(UUID.class), eq(userId)))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> variableCostService.findById(userId, UUID.randomUUID()));
    }

    @Test
    void shouldNotReturnVariableCostBelongingToAnotherUser() {
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> variableCostService.findById(userId, fabricCost.getId()));
    }

    @Test
    void shouldFullyUpdateVariableCost() {
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));
        when(variableCostRepository.save(any(VariableCost.class))).thenAnswer(inv -> inv.getArgument(0));

        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido premium")
                .unitAmount(new BigDecimal("35.00"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .build();

        VariableCostResponse response = variableCostService.update(userId, fabricCost.getId(), request);

        assertEquals("Tecido premium", response.getName());
        assertEquals(new BigDecimal("35.00"), response.getUnitAmount());
        assertEquals(VariableCostCategory.MATERIA_PRIMA, response.getCategory());
    }

    @Test
    void shouldRejectFullUpdateWhenUnitAmountIsMissing() {
        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido")
                .category(VariableCostCategory.MATERIA_PRIMA)
                .build();

        assertThrows(InvalidRequestException.class,
                () -> variableCostService.update(userId, fabricCost.getId(), request));
    }

    @Test
    void shouldPatchOnlyUnitAmount() {
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));
        when(variableCostRepository.save(any(VariableCost.class))).thenAnswer(inv -> inv.getArgument(0));

        VariableCostRequest request = VariableCostRequest.builder()
                .unitAmount(new BigDecimal("28.90"))
                .build();

        VariableCostResponse response = variableCostService.patch(userId, fabricCost.getId(), request);

        assertEquals("Tecido", response.getName());
        assertEquals(new BigDecimal("28.90"), response.getUnitAmount());
        assertEquals(VariableCostCategory.MATERIA_PRIMA, response.getCategory());
    }

    @Test
    void shouldPatchProductIdWithNull() {
        fabricCost.setProductId(UUID.randomUUID());
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));
        when(variableCostRepository.save(any(VariableCost.class))).thenAnswer(inv -> inv.getArgument(0));

        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido avulso")
                .build();

        VariableCostResponse response = variableCostService.patch(userId, fabricCost.getId(), request);

        assertEquals("Tecido avulso", response.getName());
        assertEquals(fabricCost.getProductId(), response.getProductId());
    }

    @Test
    void shouldRejectPatchWithBlankName() {
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));

        VariableCostRequest request = VariableCostRequest.builder()
                .name("   ")
                .build();

        assertThrows(InvalidRequestException.class,
                () -> variableCostService.patch(userId, fabricCost.getId(), request));
    }

    @Test
    void shouldClearProductIdOnFullUpdate() {
        fabricCost.setProductId(UUID.randomUUID());
        when(variableCostRepository.findByIdAndUserIdAndActiveTrue(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));
        when(variableCostRepository.save(any(VariableCost.class))).thenAnswer(inv -> inv.getArgument(0));

        VariableCostRequest request = VariableCostRequest.builder()
                .name("Tecido")
                .unitAmount(new BigDecimal("25.50"))
                .category(VariableCostCategory.MATERIA_PRIMA)
                .productId(null)
                .build();

        VariableCostResponse response = variableCostService.update(userId, fabricCost.getId(), request);

        assertEquals(null, response.getProductId());
    }

    @Test
    void shouldSoftDeleteVariableCost() {
        when(variableCostRepository.findByIdAndUserId(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));

        variableCostService.delete(userId, fabricCost.getId());

        assertFalse(fabricCost.getActive());
    }

    @Test
    void shouldKeepDeletedCostInactiveOnRepeatedDelete() {
        fabricCost.setActive(false);
        when(variableCostRepository.findByIdAndUserId(fabricCost.getId(), userId))
                .thenReturn(Optional.of(fabricCost));

        variableCostService.delete(userId, fabricCost.getId());

        assertFalse(fabricCost.getActive());
    }

    @Test
    void shouldThrowNotFoundWhenDeletingCostOfAnotherUser() {
        when(variableCostRepository.findByIdAndUserId(fabricCost.getId(), userId))
                .thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> variableCostService.delete(userId, fabricCost.getId()));
    }

    @Test
    void shouldRejectNegativePageOnListing() {
        assertThrows(InvalidRequestException.class,
                () -> variableCostService.findAll(userId, null, null, -1, 20));
    }

    @Test
    void shouldRejectZeroSizeOnListing() {
        assertThrows(InvalidRequestException.class,
                () -> variableCostService.findAll(userId, null, null, 0, 0));
    }

    @Test
    void shouldRejectSizeAboveMaxOnListing() {
        assertThrows(InvalidRequestException.class,
                () -> variableCostService.findAll(userId, null, null, 0, 101));
    }

    @Test
    void shouldCreateVariableCostWithoutProduct() {
        VariableCostRequest request = VariableCostRequest.builder()
                .name("Comissão")
                .unitAmount(new BigDecimal("5.00"))
                .category(VariableCostCategory.COMISSAO)
                .build();

        VariableCost cost = VariableCost.builder()
                .id(UUID.randomUUID())
                .name("Comissão")
                .unitAmount(new BigDecimal("5.00"))
                .category(VariableCostCategory.COMISSAO)
                .active(true)
                .build();

        when(variableCostRepository.save(any(VariableCost.class))).thenReturn(cost);

        VariableCostResponse response = variableCostService.create(userId, request);

        assertNull(response.getProductId());
    }
}
