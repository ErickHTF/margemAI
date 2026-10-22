package com.example.margemAI.service;

import com.example.margemAI.dto.response.SegmentCostSuggestionResponse;
import com.example.margemAI.dto.response.SegmentGuidanceResponse;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SegmentGuidanceServiceTest {

    @Mock
    private SegmentRepository segmentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private SegmentGuidanceService segmentGuidanceService;

    @ParameterizedTest
    @CsvSource({
            "COMERCIO, Comércio Varejista e Atacadista, COMERCIO, COM_EMB_01, embalagens",
            "SERVICOS, Prestação de Serviços, SERVICOS, SRV_DESLOC_01, combustível",
            "INDUSTRIA, Pequena Indústria e Manufatura, INDUSTRIA, IND_MP_01, insumos",
            "ALIMENTACAO, Alimentação e Gastronomia, ALIMENTACAO, ALI_GAS_01, Fornos",
            "COMERCIO_E_SERVICOS, Comércio e Serviços, COMERCIO_E_SERVICOS, CS_PECAS_01, peças"
    })
    @DisplayName("Retorna regras versionadas por segmento com sugestões opcionais e explicações não vazias")
    void shouldReturnVersionedRulesBySegment(
            String inputCode,
            String segmentDisplayName,
            String expectedSegmentCode,
            String expectedSuggestionCode,
            String expectedKeywordInExplanation) {
        when(segmentRepository.findByCodeIgnoreCase(inputCode))
                .thenReturn(Optional.of(Segment.builder()
                        .id(UUID.randomUUID())
                        .code(inputCode)
                        .name(segmentDisplayName)
                        .active(true)
                        .build()));

        SegmentGuidanceResponse response = segmentGuidanceService.getGuidance(null, null, inputCode);

        assertThat(response.getRuleVersion()).isEqualTo("2026.1");
        assertThat(response.getSegmentCode()).isEqualTo(expectedSegmentCode);
        assertThat(response.getSegmentName()).isEqualTo(segmentDisplayName);
        assertThat(response.isFallbackUsed()).isFalse();
        assertThat(response.getSebraeGuidanceSummary()).isNotBlank();
        assertThat(response.getCostSuggestions()).isNotEmpty();
        assertThat(response.getCostSuggestions())
                .extracting(SegmentCostSuggestionResponse::getCode)
                .contains(expectedSuggestionCode);
        assertThat(response.getCostSuggestions()).allSatisfy(item -> {
            assertThat(item.isMandatory()).isFalse();
            assertThat(item.getWhyItMatters()).isNotBlank();
            assertThat(item.getName()).isNotBlank();
            assertThat(item.getCategory()).isNotBlank();
            assertThat(item.getCostType()).isIn("FIXED", "VARIABLE");
            assertThat(item.getSuggestedAmount()).isNotNull().isPositive();
        });
        assertThat(response.getCostSuggestions())
                .anySatisfy(item -> assertThat(item.getWhyItMatters()).containsIgnoringCase(expectedKeywordInExplanation));
    }

    @Test
    @DisplayName("Resolve orientação pelo segmento do perfil do usuário autenticado quando nenhum filtro é enviado")
    void shouldResolveGuidanceFromAuthenticatedUserProfile() {
        UUID userId = UUID.randomUUID();
        Segment userSegment = Segment.builder()
                .id(UUID.randomUUID())
                .code("ALIMENTACAO")
                .name("Alimentação e Gastronomia")
                .active(true)
                .build();
        User user = User.builder()
                .id(userId)
                .name("João Marmitas")
                .segment(userSegment)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        SegmentGuidanceResponse response = segmentGuidanceService.getGuidance(userId, null, null);

        assertThat(response.getRuleVersion()).isEqualTo("2026.1");
        assertThat(response.getSegmentCode()).isEqualTo("ALIMENTACAO");
        assertThat(response.getSegmentName()).isEqualTo("Alimentação e Gastronomia");
        assertThat(response.isFallbackUsed()).isFalse();
        assertThat(response.getCostSuggestions()).allMatch(item -> !item.isMandatory());
    }

    @Test
    @DisplayName("Resolve orientação por segmentId quando informado explicitamente")
    void shouldResolveGuidanceBySegmentId() {
        UUID segmentId = UUID.randomUUID();
        when(segmentRepository.findById(segmentId)).thenReturn(Optional.of(Segment.builder()
                .id(segmentId)
                .code("SERVICOS")
                .name("Prestação de Serviços")
                .active(true)
                .build()));

        SegmentGuidanceResponse response = segmentGuidanceService.getGuidance(null, segmentId, null);

        assertThat(response.getSegmentCode()).isEqualTo("SERVICOS");
        assertThat(response.getSegmentName()).isEqualTo("Prestação de Serviços");
        assertThat(response.isFallbackUsed()).isFalse();
        assertThat(response.getCostSuggestions()).allMatch(item -> !item.isMandatory());
    }

    @ParameterizedTest
    @CsvSource(value = {
            "OUTRO",
            "SEGMENTO_SEM_CATALOGO",
            "'   '",
            "NULL"
    }, nullValues = "NULL")
    @DisplayName("Aplica fallback genérico quando o segmento não possui catálogo dedicado ou não foi informado")
    void shouldUseGenericFallbackWhenSegmentHasNoDedicatedCatalog(String segmentName) {
        SegmentGuidanceResponse response = segmentGuidanceService.getGuidance(null, null, segmentName);

        assertThat(response.getRuleVersion()).isEqualTo("2026.1");
        assertThat(response.getSegmentCode()).isEqualTo("GERAL");
        assertThat(response.getSegmentName()).isEqualTo("Geral (MEI)");
        assertThat(response.isFallbackUsed()).isTrue();
        assertThat(response.getSebraeGuidanceSummary()).isNotBlank();
        assertThat(response.getCostSuggestions()).isNotEmpty();
        assertThat(response.getCostSuggestions()).allSatisfy(item -> {
            assertThat(item.isMandatory()).isFalse();
            assertThat(item.getWhyItMatters()).isNotBlank();
            assertThat(item.getSuggestedAmount()).isNotNull().isPositive();
        });
    }
}
