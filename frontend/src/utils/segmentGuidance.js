export const DEFAULT_RULE_VERSION = '2026.1'

export const GENERIC_SEGMENT_FALLBACK = {
  ruleVersion: DEFAULT_RULE_VERSION,
  segmentCode: 'GERAL',
  segmentName: 'Geral (MEI)',
  fallbackUsed: true,
  sebraeGuidanceSummary:
    'Orientação geral SEBRAE para MEI: separe as contas pessoais das empresariais, acompanhe todas as despesas fixas mensais e registre os custos diretos de cada venda antes de definir seus preços.',
  costSuggestions: [
    {
      code: 'GEN_DAS_01',
      name: 'Guia mensal DAS MEI',
      costType: 'FIXED',
      category: 'DAS_MEI',
      suggestedAmount: 76.9,
      suggestedPercent: null,
      whyItMatters:
        'Obrigação mensal fixa do MEI para manter o CNPJ ativo e garantir a cobertura previdenciária do empreendedor.',
      mandatory: false
    },
    {
      code: 'GEN_PROLAB_01',
      name: 'Pró-labore planejado do MEI',
      costType: 'FIXED',
      category: 'PRO_LABORE',
      suggestedAmount: 1518.0,
      suggestedPercent: null,
      whyItMatters:
        'Definir uma remuneração mensal fixa para o empreendedor evita misturar o caixa do negócio com despesas domésticas.',
      mandatory: false
    },
    {
      code: 'GEN_INSUMO_01',
      name: 'Insumo ou mercadoria principal por venda',
      costType: 'VARIABLE',
      category: 'MATERIA_PRIMA',
      suggestedAmount: 10.0,
      suggestedPercent: 25.0,
      whyItMatters:
        'Todo produto vendido ou serviço prestado consome materiais diretos que precisam ser repostos a cada venda.',
      mandatory: false
    }
  ]
}

export function normalizeSegmentGuidance(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.costSuggestions) || raw.costSuggestions.length === 0) {
    return {
      ...GENERIC_SEGMENT_FALLBACK,
      costSuggestions: GENERIC_SEGMENT_FALLBACK.costSuggestions.map((item) => ({ ...item, mandatory: false }))
    }
  }

  const sanitizedSuggestions = raw.costSuggestions
    .filter((item) => item && typeof item.name === 'string' && item.name.trim().length > 0)
    .map((item) => ({
      code: item.code || 'SUGESTAO',
      name: item.name.trim(),
      costType: item.costType === 'VARIABLE' ? 'VARIABLE' : 'FIXED',
      category: item.category || 'OUTRO',
      suggestedAmount: item.suggestedAmount != null ? Number(item.suggestedAmount) : null,
      suggestedPercent: item.suggestedPercent != null ? Number(item.suggestedPercent) : null,
      whyItMatters:
        typeof item.whyItMatters === 'string' && item.whyItMatters.trim().length > 0
          ? item.whyItMatters.trim()
          : 'Custo recorrente neste segmento; ajuste o valor conforme a realidade do seu negócio.',
      mandatory: false
    }))

  if (sanitizedSuggestions.length === 0) {
    return {
      ...GENERIC_SEGMENT_FALLBACK,
      costSuggestions: GENERIC_SEGMENT_FALLBACK.costSuggestions.map((item) => ({ ...item, mandatory: false }))
    }
  }

  return {
    ruleVersion:
      typeof raw.ruleVersion === 'string' && raw.ruleVersion.trim().length > 0
        ? raw.ruleVersion.trim()
        : DEFAULT_RULE_VERSION,
    segmentCode: raw.segmentCode || 'GERAL',
    segmentName:
      typeof raw.segmentName === 'string' && raw.segmentName.trim().length > 0
        ? raw.segmentName.trim()
        : 'Geral (MEI)',
    fallbackUsed: Boolean(raw.fallbackUsed),
    sebraeGuidanceSummary:
      typeof raw.sebraeGuidanceSummary === 'string' && raw.sebraeGuidanceSummary.trim().length > 0
        ? raw.sebraeGuidanceSummary.trim()
        : GENERIC_SEGMENT_FALLBACK.sebraeGuidanceSummary,
    costSuggestions: sanitizedSuggestions
  }
}

export function suggestionToCostDraft(suggestion) {
  if (!suggestion || typeof suggestion !== 'object') {
    return null
  }

  const isVariable = suggestion.costType === 'VARIABLE'
  const kind = isVariable ? 'variable' : 'fixed'
  const amount = Number(suggestion.suggestedAmount) > 0 ? Number(suggestion.suggestedAmount) : 0

  const baseDraft = {
    name: String(suggestion.name || '').trim(),
    category: String(suggestion.category || ''),
    whyItMatters: String(suggestion.whyItMatters || '').trim(),
    suggestionCode: suggestion.code || null,
    fromSuggestion: true
  }

  if (isVariable) {
    return {
      kind,
      draft: {
        ...baseDraft,
        unitAmount: amount,
        productId: ''
      }
    }
  }

  return {
    kind,
    draft: {
      ...baseDraft,
      amount,
      recurring: true,
      dueDate: ''
    }
  }
}

export function costManagerSlot(pendingSuggestion, kind) {
  const isTarget = pendingSuggestion?.kind === kind
  return {
    key: isTarget ? `${kind}-${pendingSuggestion.nonce}` : kind,
    initialDraft: isTarget ? pendingSuggestion.draft ?? null : null
  }
}

export function consumeSuggestionDraft(pendingSuggestion) {
  return pendingSuggestion ? { ...pendingSuggestion, draft: null } : null
}
