package com.example.margemAI.service;

import com.example.margemAI.dto.request.ProfileUpdateRequest;
import com.example.margemAI.dto.response.ProfileResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private static final String FULL_UPDATE_REQUIRED_MESSAGE =
            "Nome, segmento e teto anual são obrigatórios para a atualização completa do perfil.";
    private static final String NAME_INVALID_MESSAGE =
            "O nome deve ter entre 2 e 150 caracteres.";

    private final UserRepository userRepository;
    private final SegmentService segmentService;

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(UUID userId) {
        return toResponse(findUser(userId));
    }

    @Transactional
    public ProfileResponse updateProfile(UUID userId, ProfileUpdateRequest request) {
        User user = findUser(userId);
        String name = request.getName();
        String segmentCode = request.getSegment();
        BigDecimal customAnnualCap = request.getCustomAnnualCap();

        if (name == null || segmentCode == null || customAnnualCap == null) {
            throw new InvalidRequestException(FULL_UPDATE_REQUIRED_MESSAGE);
        }

        apply(user, normalizeName(name), segmentCode, customAnnualCap);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public ProfileResponse patchProfile(UUID userId, ProfileUpdateRequest request) {
        User user = findUser(userId);

        if (request.getName() != null) {
            user.setName(normalizeName(request.getName()));
        }
        if (request.getSegment() != null) {
            user.setSegment(segmentService.findByCode(request.getSegment()));
        }
        if (request.getCustomAnnualCap() != null) {
            user.setCustomAnnualCap(request.getCustomAnnualCap());
        }

        return toResponse(userRepository.save(user));
    }

    private void apply(User user, String name, String segmentCode, BigDecimal customAnnualCap) {
        user.setName(name);
        user.setSegment(segmentService.findByCode(segmentCode));
        user.setCustomAnnualCap(customAnnualCap);
    }

    private String normalizeName(String name) {
        String trimmed = name.trim();
        if (trimmed.length() < 2) {
            throw new InvalidRequestException(NAME_INVALID_MESSAGE);
        }
        return trimmed;
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));
    }

    private ProfileResponse toResponse(User user) {
        Segment segment = user.getSegment();
        BigDecimal cap = user.getCustomAnnualCap() != null
                ? user.getCustomAnnualCap()
                : User.DEFAULT_MEI_ANNUAL_CAP;

        return ProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .cnpj(user.getCnpj())
                .segment(segment.getCode())
                .customAnnualCap(cap)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
