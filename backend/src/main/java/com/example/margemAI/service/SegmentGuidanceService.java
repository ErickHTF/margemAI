package com.example.margemAI.service;

import com.example.margemAI.dto.response.SegmentCostSuggestionResponse;
import com.example.margemAI.dto.response.SegmentGuidanceResponse;
import com.example.margemAI.model.FixedCostCategory;
import com.example.margemAI.model.Segment;
import com.example.margemAI.model.User;
import com.example.margemAI.model.VariableCostCategory;
import com.example.margemAI.repository.SegmentRepository;
import com.example.margemAI.repository.UserRepository;
import com.example.margemAI.util.Money;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SegmentGuidanceService {

    public static final String CURRENT_RULE_VERSION = "2026.1";

    private final SegmentRepository segmentRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public SegmentGuidanceResponse getGuidance(UUID userId, UUID segmentId, String segmentName) {
        if (segmentId != null) {
            Optional<Segment> byId = segmentRepository.findById(segmentId);
            if (byId.isPresent()) {
                Segment segment = byId.get();
                return resolveRule(segment.getCode(), segment.getName());
            }
            return buildGenericFallback();
        }

        if (segmentName != null && !segmentName.isBlank()) {
            String trimmed = segmentName.trim();
            Optional<Segment> byCode = segmentRepository.findByCodeIgnoreCase(trimmed);
            if (byCode.isPresent()) {
                Segment segment = byCode.get();
                return resolveRule(segment.getCode(), segment.getName());
            }
            return resolveRule(trimmed, trimmed);
        }

        if (userId != null) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent() && userOpt.get().getSegment() != null) {
                Segment segment = userOpt.get().getSegment();
                return resolveRule(segment.getCode(), segment.getName());
            }
        }

        return buildGenericFallback();
    }

    private SegmentGuidanceResponse resolveRule(String codeOrName, String displayName) {
        String key = normalizeKey(codeOrName);
        String normalizedDisplay = normalizeKey(displayName);

        if (matchesComercioEServicos(key, normalizedDisplay)) {
            return buildComercioEServicosGuidance(resolveDisplayName(displayName, "Comércio e Serviços"));
        }
        if (matchesAlimentacao(key, normalizedDisplay)) {
            return buildAlimentacaoGuidance(resolveDisplayName(displayName, "Alimentação e Gastronomia"));
        }
        if (matchesIndustria(key, normalizedDisplay)) {
            return buildIndustriaGuidance(resolveDisplayName(displayName, "Pequena Indústria e Manufatura"));
        }
        if (matchesComercio(key, normalizedDisplay)) {
            return buildComercioGuidance(resolveDisplayName(displayName, "Comércio Varejista e Atacadista"));
        }
        if (matchesServicos(key, normalizedDisplay)) {
            return buildServicosGuidance(resolveDisplayName(displayName, "Prestação de Serviços"));
        }

        return buildGenericFallback();
    }

    private String resolveDisplayName(String candidate, String defaultName) {
        if (candidate == null || candidate.isBlank()) {
            return defaultName;
        }
        String trimmed = candidate.trim();
        if (trimmed.equals(trimmed.toUpperCase(Locale.ROOT)) && !trimmed.contains(" ")) {
            return defaultName;
        }
        return trimmed;
    }

    private boolean matchesComercioEServicos(String key, String display) {
        return key.equals("COMERCIO_E_SERVICOS")
                || key.equals("COMERCIO_SERVICOS")
                || key.equals("COMERCIO E SERVICOS")
                || display.contains("COMERCIO E SERVICOS");
    }

    private boolean matchesComercio(String key, String display) {
        return key.equals("COMERCIO")
                || key.equals("VESTUARIO")
                || key.startsWith("COMERCIO ")
                || display.startsWith("COMERCIO ")
                || display.contains("VAREJISTA")
                || display.contains("VESTUARIO");
    }

    private boolean matchesServicos(String key, String display) {
        return key.equals("SERVICOS")
                || key.equals("SERVICO")
                || key.equals("BELEZA")
                || key.equals("TECNOLOGIA")
                || key.equals("AUTOMOTIVO")
                || key.equals("CONSTRUCAO")
                || key.contains("SERVICO")
                || display.contains("SERVICO")
                || display.contains("BELEZA")
                || display.contains("TECNOLOGIA")
                || display.contains("CONSTRUCAO");
    }

    private boolean matchesIndustria(String key, String display) {
        return key.equals("INDUSTRIA")
                || key.contains("INDUSTRIA")
                || key.contains("MANUFATURA")
                || display.contains("INDUSTRIA")
                || display.contains("MANUFATURA");
    }

    private boolean matchesAlimentacao(String key, String display) {
        return key.equals("ALIMENTACAO")
                || key.contains("ALIMENTACAO")
                || key.contains("GASTRONOMIA")
                || display.contains("ALIMENTACAO")
                || display.contains("GASTRONOMIA");
    }

    private SegmentGuidanceResponse buildComercioGuidance(String segmentName) {
        return SegmentGuidanceResponse.builder()
                .ruleVersion(CURRENT_RULE_VERSION)
                .segmentCode("COMERCIO")
                .segmentName(segmentName)
                .fallbackUsed(false)
                .sebraeGuidanceSummary("No Comércio, o SEBRAE recomenda controlar de perto o custo de reposição das mercadorias, embalagens e fretes por pedido, além de manter as despesas fixas da loja ou operação online organizadas.")
                .costSuggestions(List.of(
                        suggestion(
                                "COM_EMB_01",
                                "Embalagens, sacolas e etiquetas",
                                "VARIABLE",
                                VariableCostCategory.EMBALAGEM.name(),
                                "1.50",
                                "3.00",
                                "No comércio, embalagens, sacolas, caixas e etiquetas protegem a mercadoria e compõem o custo direto de cada venda."
                        ),
                        suggestion(
                                "COM_FRETE_01",
                                "Frete de compra e entrega de mercadorias",
                                "VARIABLE",
                                VariableCostCategory.FRETE.name(),
                                "4.50",
                                "5.00",
                                "O frete pago para repor o estoque ou entregar ao cliente reduz a margem se não for considerado no custo unitário."
                        ),
                        suggestion(
                                "COM_DAS_01",
                                "DAS MEI (Comércio)",
                                "FIXED",
                                FixedCostCategory.DAS_MEI.name(),
                                "76.90",
                                null,
                                "Guia mensal fixa do MEI com ICMS incluso para manter o CNPJ regularizado e a cobertura previdenciária em dia."
                        ),
                        suggestion(
                                "COM_INTERNET_01",
                                "Internet e sistema de vendas/estoque",
                                "FIXED",
                                FixedCostCategory.INTERNET.name(),
                                "99.90",
                                null,
                                "Conexão estável é essencial no comércio para operar maquininha, Pix, catálogo digital e atendimento ao cliente."
                        )
                ))
                .build();
    }

    private SegmentGuidanceResponse buildServicosGuidance(String segmentName) {
        return SegmentGuidanceResponse.builder()
                .ruleVersion(CURRENT_RULE_VERSION)
                .segmentCode("SERVICOS")
                .segmentName(segmentName)
                .fallbackUsed(false)
                .sebraeGuidanceSummary("Na Prestação de Serviços, o SEBRAE orienta considerar o deslocamento até o cliente, os materiais consumidos em cada atendimento e a reserva mensal para manutenção de equipamentos e ferramentas.")
                .costSuggestions(List.of(
                        suggestion(
                                "SRV_DESLOC_01",
                                "Deslocamento e transporte por atendimento",
                                "VARIABLE",
                                VariableCostCategory.FRETE.name(),
                                "15.00",
                                "8.00",
                                "Em serviços, combustível, transporte público ou estacionamento gastos para atender o cliente impactam diretamente a margem do orçamento."
                        ),
                        suggestion(
                                "SRV_INSUMO_01",
                                "Materiais de consumo aplicados no serviço",
                                "VARIABLE",
                                VariableCostCategory.MATERIA_PRIMA.name(),
                                "12.00",
                                "10.00",
                                "Produtos e insumos usados durante a execução variam conforme o volume de atendimentos realizados no mês."
                        ),
                        suggestion(
                                "SRV_MANUT_01",
                                "Manutenção e reposição de equipamentos",
                                "FIXED",
                                FixedCostCategory.MANUTENCAO.name(),
                                "120.00",
                                null,
                                "Ferramentas, máquinas e computadores sofrem desgaste contínuo; reservar valor mensal evita paradas inesperadas."
                        ),
                        suggestion(
                                "SRV_DAS_01",
                                "DAS MEI (Serviços)",
                                "FIXED",
                                FixedCostCategory.DAS_MEI.name(),
                                "80.90",
                                null,
                                "Contribuição mensal fixa do MEI prestador de serviços (INSS + ISS) para regularidade fiscal e emissão de nota."
                        )
                ))
                .build();
    }

    private SegmentGuidanceResponse buildIndustriaGuidance(String segmentName) {
        return SegmentGuidanceResponse.builder()
                .ruleVersion(CURRENT_RULE_VERSION)
                .segmentCode("INDUSTRIA")
                .segmentName(segmentName)
                .fallbackUsed(false)
                .sebraeGuidanceSummary("Na Pequena Indústria e Manufatura, o SEBRAE destaca a importância de medir o rendimento da matéria-prima, prever perdas do processo produtivo e acompanhar o gasto de energia e manutenção das máquinas.")
                .costSuggestions(List.of(
                        suggestion(
                                "IND_MP_01",
                                "Matéria-prima e componentes de produção",
                                "VARIABLE",
                                VariableCostCategory.MATERIA_PRIMA.name(),
                                "18.00",
                                "35.00",
                                "Na produção artesanal ou industrial, os insumos transformados representam a maior parcela do custo variável por unidade fabricada."
                        ),
                        suggestion(
                                "IND_PERDA_01",
                                "Perdas técnicas e aparas de fabricação",
                                "VARIABLE",
                                VariableCostCategory.DESPERDICIO.name(),
                                "2.50",
                                "5.00",
                                "Retalhos, quebras e sobras de lote precisam ser previstos para que as unidades vendidas cubram todo o material adquirido."
                        ),
                        suggestion(
                                "IND_ENERGIA_01",
                                "Energia elétrica da produção",
                                "FIXED",
                                FixedCostCategory.ENERGIA.name(),
                                "220.00",
                                null,
                                "Máquinas, motores, fornos e iluminação da oficina elevam o consumo mensal de energia elétrica."
                        ),
                        suggestion(
                                "IND_MANUT_01",
                                "Manutenção preventiva de maquinário",
                                "FIXED",
                                FixedCostCategory.MANUTENCAO.name(),
                                "150.00",
                                null,
                                "Revisões periódicas das máquinas reduzem quebras e atrasos na entrega das encomendas."
                        )
                ))
                .build();
    }

    private SegmentGuidanceResponse buildAlimentacaoGuidance(String segmentName) {
        return SegmentGuidanceResponse.builder()
                .ruleVersion(CURRENT_RULE_VERSION)
                .segmentCode("ALIMENTACAO")
                .segmentName(segmentName)
                .fallbackUsed(false)
                .sebraeGuidanceSummary("Em Alimentação e Gastronomia, o SEBRAE orienta montar a ficha técnica de cada receita, contabilizar embalagens de entrega, prever perdas de insumos perecíveis e acompanhar o gasto com gás e refrigeração.")
                .costSuggestions(List.of(
                        suggestion(
                                "ALI_INSUMO_01",
                                "Ingredientes por porção (ficha técnica)",
                                "VARIABLE",
                                VariableCostCategory.MATERIA_PRIMA.name(),
                                "8.50",
                                "30.00",
                                "Na alimentação, calcular o custo exato dos ingredientes de cada prato ou doce protege a margem contra variações de preço nos mercados."
                        ),
                        suggestion(
                                "ALI_PERDA_01",
                                "Perdas de insumos perecíveis e preparo",
                                "VARIABLE",
                                VariableCostCategory.DESPERDICIO.name(),
                                "1.80",
                                "6.00",
                                "Alimentos sofrem redução no descasque, cocção e validade; considerar essa perda evita vender abaixo do custo real."
                        ),
                        suggestion(
                                "ALI_EMB_01",
                                "Embalagens térmicas, potes e lacres",
                                "VARIABLE",
                                VariableCostCategory.EMBALAGEM.name(),
                                "2.20",
                                "7.00",
                                "Marmitas, caixas, guardanapos e lacres acompanham cada pedido e fazem parte do custo variável unitário."
                        ),
                        suggestion(
                                "ALI_GAS_01",
                                "Gás de cozinha e energia térmica/refrigeração",
                                "FIXED",
                                FixedCostCategory.ENERGIA.name(),
                                "280.00",
                                null,
                                "Fornos, fogões, geladeiras e freezers ligados continuamente geram custo mensal relevante na operação gastronômica."
                        )
                ))
                .build();
    }

    private SegmentGuidanceResponse buildComercioEServicosGuidance(String segmentName) {
        return SegmentGuidanceResponse.builder()
                .ruleVersion(CURRENT_RULE_VERSION)
                .segmentCode("COMERCIO_E_SERVICOS")
                .segmentName(segmentName)
                .fallbackUsed(false)
                .sebraeGuidanceSummary("Para MEIs que combinam Comércio e Serviços, o SEBRAE recomenda separar o custo das peças/mercadorias vendidas do custo de execução do serviço, além de acompanhar a guia unificada do DAS MEI.")
                .costSuggestions(List.of(
                        suggestion(
                                "CS_PECAS_01",
                                "Peças, produtos e embalagens aplicados",
                                "VARIABLE",
                                VariableCostCategory.MATERIA_PRIMA.name(),
                                "14.00",
                                "25.00",
                                "Negócios mistos precisam registrar o custo de reposição das peças e mercadorias separadamente da mão de obra."
                        ),
                        suggestion(
                                "CS_DESLOC_01",
                                "Frete de entrega ou deslocamento técnico",
                                "VARIABLE",
                                VariableCostCategory.FRETE.name(),
                                "10.00",
                                "6.00",
                                "Entregas de produtos e visitas técnicas consomem combustível e transporte a cada chamado."
                        ),
                        suggestion(
                                "CS_DAS_01",
                                "DAS MEI (Comércio e Serviços)",
                                "FIXED",
                                FixedCostCategory.DAS_MEI.name(),
                                "81.90",
                                null,
                                "Guia mensal fixa do MEI que exerce atividades conjuntas de comércio e prestação de serviços (INSS + ICMS + ISS)."
                        ),
                        suggestion(
                                "CS_MANUT_01",
                                "Manutenção de ferramentas e ponto de atendimento",
                                "FIXED",
                                FixedCostCategory.MANUTENCAO.name(),
                                "130.00",
                                null,
                                "Conservação dos equipamentos usados tanto nos reparos/serviços quanto no atendimento comercial."
                        )
                ))
                .build();
    }

    private SegmentGuidanceResponse buildGenericFallback() {
        return SegmentGuidanceResponse.builder()
                .ruleVersion(CURRENT_RULE_VERSION)
                .segmentCode("GERAL")
                .segmentName("Geral (MEI)")
                .fallbackUsed(true)
                .sebraeGuidanceSummary("Orientação geral SEBRAE para MEI: separe as contas pessoais das empresariais, acompanhe todas as despesas fixas mensais e registre os custos diretos de cada venda antes de definir seus preços.")
                .costSuggestions(List.of(
                        suggestion(
                                "GEN_DAS_01",
                                "Guia mensal DAS MEI",
                                "FIXED",
                                FixedCostCategory.DAS_MEI.name(),
                                "76.90",
                                null,
                                "Obrigação mensal fixa do MEI para manter o CNPJ ativo e garantir a cobertura previdenciária do empreendedor."
                        ),
                        suggestion(
                                "GEN_PROLAB_01",
                                "Pró-labore planejado do MEI",
                                "FIXED",
                                FixedCostCategory.PRO_LABORE.name(),
                                "1518.00",
                                null,
                                "Definir uma remuneração mensal fixa para o empreendedor evita misturar o caixa do negócio com despesas domésticas."
                        ),
                        suggestion(
                                "GEN_INTERNET_01",
                                "Internet e telefone comercial",
                                "FIXED",
                                FixedCostCategory.INTERNET.name(),
                                "89.90",
                                null,
                                "Atendimento por mensagens, recebimento via Pix e gestão do negócio dependem de conectividade contínua."
                        ),
                        suggestion(
                                "GEN_INSUMO_01",
                                "Insumo ou mercadoria principal por venda",
                                "VARIABLE",
                                VariableCostCategory.MATERIA_PRIMA.name(),
                                "10.00",
                                "25.00",
                                "Todo produto vendido ou serviço prestado consome materiais diretos que precisam ser repostos a cada venda."
                        )
                ))
                .build();
    }

    private SegmentCostSuggestionResponse suggestion(
            String code,
            String name,
            String costType,
            String category,
            String suggestedAmount,
            String suggestedPercent,
            String whyItMatters) {
        return SegmentCostSuggestionResponse.builder()
                .code(code)
                .name(name)
                .costType(costType)
                .category(category)
                .suggestedAmount(suggestedAmount != null ? Money.round(new BigDecimal(suggestedAmount)) : null)
                .suggestedPercent(suggestedPercent != null ? Money.round(new BigDecimal(suggestedPercent)) : null)
                .whyItMatters(whyItMatters)
                .mandatory(false)
                .build();
    }

    private String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        String decomposed = Normalizer.normalize(value.trim(), Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT);
    }
}
