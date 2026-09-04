package com.example.margemAI.service;

import com.example.margemAI.dto.request.ProfileUpdateRequest;
import com.example.margemAI.dto.response.ProfileResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SegmentService segmentService;

    @InjectMocks
    private ProfileService profileService;

    private UUID userId;
    private Segment comercioSegment;
    private Segment servicosSegment;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        comercioSegment = Segment.builder()
                .id(UUID.randomUUID())
                .code("COMERCIO")
                .name("Comércio Varejista e Atacadista")
                .active(true)
                .build();

        servicosSegment = Segment.builder()
                .id(UUID.randomUUID())
                .code("SERVICOS")
                .name("Prestação de Serviços")
                .active(true)
                .build();

        user = User.builder()
                .id(userId)
                .name("Maria Silva")
                .email("maria@email.com")
                .password("encoded_password")
                .cnpj("12ABC345000190")
                .segment(comercioSegment)
                .customAnnualCap(new BigDecimal("81000.00"))
                .createdAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .build();
    }

    @Test
    void shouldReturnProfileWithDefaultCapWhenValueIsMissing() {
        user.setCustomAnnualCap(null);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileResponse response = profileService.getProfile(userId);

        assertEquals(userId, response.getId());
        assertEquals("Maria Silva", response.getName());
        assertEquals("maria@email.com", response.getEmail());
        assertEquals("12ABC345000190", response.getCnpj());
        assertEquals("COMERCIO", response.getSegment());
        assertEquals(User.DEFAULT_MEI_ANNUAL_CAP, response.getCustomAnnualCap());
        assertEquals(user.getCreatedAt(), response.getCreatedAt());
    }

    @Test
    void shouldReturnProfileWithStoredCustomCap() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileResponse response = profileService.getProfile(userId);

        assertEquals(new BigDecimal("81000.00"), response.getCustomAnnualCap());
        assertEquals("COMERCIO", response.getSegment());
    }

    @Test
    void shouldThrowResourceNotFoundWhenUserDoesNotExist() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> profileService.getProfile(userId));
    }

    @Test
    void shouldFullyUpdateProfileWithPut() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(segmentService.findByCode("SERVICOS")).thenReturn(servicosSegment);
        when(userRepository.save(any(User.class))).thenReturn(user);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("  Maria Souza  ")
                .segment("SERVICOS")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        ProfileResponse response = profileService.updateProfile(userId, request);

        assertEquals("Maria Souza", user.getName());
        assertEquals(servicosSegment, user.getSegment());
        assertEquals(new BigDecimal("95000.00"), user.getCustomAnnualCap());
        assertEquals("Maria Souza", response.getName());
        assertEquals("SERVICOS", response.getSegment());
        assertEquals(new BigDecimal("95000.00"), response.getCustomAnnualCap());
        verify(userRepository).save(user);
    }

    @Test
    void shouldRejectPutWhenNameIsMissing() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .segment("SERVICOS")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        InvalidRequestException exception = assertThrows(
                InvalidRequestException.class,
                () -> profileService.updateProfile(userId, request)
        );

        assertEquals("Nome, segmento e teto anual são obrigatórios para a atualização completa do perfil.",
                exception.getMessage());
    }

    @Test
    void shouldRejectPutWhenSegmentIsMissing() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("Maria Souza")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        assertThrows(InvalidRequestException.class, () -> profileService.updateProfile(userId, request));
    }

    @Test
    void shouldRejectPutWhenCustomAnnualCapIsMissing() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("Maria Souza")
                .segment("SERVICOS")
                .build();

        assertThrows(InvalidRequestException.class, () -> profileService.updateProfile(userId, request));
    }

    @Test
    void shouldRejectWhitespaceOnlyName() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("   ")
                .segment("SERVICOS")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        assertThrows(InvalidRequestException.class, () -> profileService.updateProfile(userId, request));
    }

    @Test
    void shouldPropagateResourceNotFoundWhenPutUsesUnknownSegment() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(segmentService.findByCode(anyString()))
                .thenThrow(new ResourceNotFoundException("Segmento 'NAO_EXISTE' não encontrado ou inativo."));

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("Maria Souza")
                .segment("NAO_EXISTE")
                .customAnnualCap(new BigDecimal("95000.00"))
                .build();

        assertThrows(ResourceNotFoundException.class, () -> profileService.updateProfile(userId, request));
    }

    @Test
    void shouldPatchOnlySegment() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(segmentService.findByCode("SERVICOS")).thenReturn(servicosSegment);
        when(userRepository.save(any(User.class))).thenReturn(user);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .segment("SERVICOS")
                .build();

        ProfileResponse response = profileService.patchProfile(userId, request);

        assertEquals(servicosSegment, user.getSegment());
        assertEquals("Maria Silva", user.getName());
        assertEquals(new BigDecimal("81000.00"), user.getCustomAnnualCap());
        assertEquals("SERVICOS", response.getSegment());
        assertEquals("Maria Silva", response.getName());
    }

    @Test
    void shouldPatchOnlyCustomAnnualCap() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .customAnnualCap(new BigDecimal("60000.00"))
                .build();

        ProfileResponse response = profileService.patchProfile(userId, request);

        assertEquals(new BigDecimal("60000.00"), user.getCustomAnnualCap());
        assertEquals("COMERCIO", user.getSegment().getCode());
        assertEquals("Maria Silva", user.getName());
        assertEquals(new BigDecimal("60000.00"), response.getCustomAnnualCap());
    }

    @Test
    void shouldPatchOnlyNameWithTrim() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder()
                .name("  Ana Lima  ")
                .build();

        ProfileResponse response = profileService.patchProfile(userId, request);

        assertEquals("Ana Lima", user.getName());
        assertEquals("COMERCIO", user.getSegment().getCode());
        assertEquals(new BigDecimal("81000.00"), user.getCustomAnnualCap());
        assertEquals("Ana Lima", response.getName());
    }

    @Test
    void shouldPatchWithoutChangesWhenAllFieldsAreNull() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        ProfileUpdateRequest request = ProfileUpdateRequest.builder().build();

        ProfileResponse response = profileService.patchProfile(userId, request);

        assertEquals("Maria Silva", user.getName());
        assertEquals("COMERCIO", user.getSegment().getCode());
        assertEquals(new BigDecimal("81000.00"), user.getCustomAnnualCap());
        assertEquals("Maria Silva", response.getName());
    }
}
