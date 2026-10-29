import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RULE_VERSION,
  GENERIC_SEGMENT_FALLBACK,
  normalizeSegmentGuidance,
  suggestionToCostDraft,
  costManagerSlot,
  consumeSuggestionDraft
} from './segmentGuidance'

describe('orientações e sugestões de custos por segmento (segmentGuidance)', () => {
  it('preserva versão da regra, segmento e explicações garantindo que nenhuma sugestão seja obrigatória', () => {
    const raw = {
      ruleVersion: '2026.1',
      segmentCode: 'COMERCIO',
      segmentName: 'Comércio Varejista e Atacadista',
      fallbackUsed: false,
      sebraeGuidanceSummary: 'Controle embalagens e frete em cada venda.',
      costSuggestions: [
        {
          code: 'COM_EMB_01',
          name: 'Embalagens, sacolas e etiquetas',
          costType: 'VARIABLE',
          category: 'EMBALAGEM',
          suggestedAmount: '1.50',
          suggestedPercent: '3.00',
          whyItMatters: 'Sacolas e caixas protegem a mercadoria vendida.',
          mandatory: true
        }
      ]
    }

    const normalized = normalizeSegmentGuidance(raw)

    expect(normalized.ruleVersion).toBe('2026.1')
    expect(normalized.segmentCode).toBe('COMERCIO')
    expect(normalized.segmentName).toBe('Comércio Varejista e Atacadista')
    expect(normalized.fallbackUsed).toBe(false)
    expect(normalized.costSuggestions).toHaveLength(1)
    expect(normalized.costSuggestions[0].mandatory).toBe(false)
    expect(normalized.costSuggestions[0].suggestedAmount).toBe(1.5)
    expect(normalized.costSuggestions[0].suggestedPercent).toBe(3)
    expect(normalized.costSuggestions[0].whyItMatters).toContain('Sacolas e caixas')
  })

  it.each([
    ['payload nulo', null],
    ['lista vazia', { ruleVersion: '2026.1', segmentName: 'Outro', costSuggestions: [] }],
    ['itens inválidos', { costSuggestions: [{ name: '   ' }] }]
  ])('retorna fallback genérico quando %s', (_label, input) => {
    const normalized = normalizeSegmentGuidance(input)

    expect(normalized.ruleVersion).toBe(DEFAULT_RULE_VERSION)
    expect(normalized.segmentCode).toBe('GERAL')
    expect(normalized.segmentName).toBe('Geral (MEI)')
    expect(normalized.fallbackUsed).toBe(true)
    expect(normalized.costSuggestions.length).toBeGreaterThan(0)
    expect(normalized.costSuggestions.every((item) => item.mandatory === false)).toBe(true)
    expect(normalized.costSuggestions.every((item) => item.whyItMatters.length > 0)).toBe(true)
  })

  it('converte sugestão de custo fixo em rascunho editável sem id para não atualizar registro existente', () => {
    const suggestion = {
      code: 'SRV_MANUT_01',
      name: 'Manutenção e reposição de equipamentos',
      costType: 'FIXED',
      category: 'MANUTENCAO',
      suggestedAmount: 120.0,
      whyItMatters: 'Ferramentas sofrem desgaste contínuo.'
    }

    const result = suggestionToCostDraft(suggestion)

    expect(result.kind).toBe('fixed')
    expect(result.draft).toEqual({
      name: 'Manutenção e reposição de equipamentos',
      category: 'MANUTENCAO',
      amount: 120,
      recurring: true,
      dueDate: '',
      whyItMatters: 'Ferramentas sofrem desgaste contínuo.',
      suggestionCode: 'SRV_MANUT_01',
      fromSuggestion: true
    })
    expect(result.draft.id).toBeUndefined()
  })

  it('converte sugestão de custo variável em rascunho editável com unitAmount preenchido', () => {
    const suggestion = {
      code: 'ALI_EMB_01',
      name: 'Embalagens térmicas, potes e lacres',
      costType: 'VARIABLE',
      category: 'EMBALAGEM',
      suggestedAmount: 2.2,
      whyItMatters: 'Marmitas e lacres acompanham cada pedido.'
    }

    const result = suggestionToCostDraft(suggestion)

    expect(result.kind).toBe('variable')
    expect(result.draft).toEqual({
      name: 'Embalagens térmicas, potes e lacres',
      category: 'EMBALAGEM',
      unitAmount: 2.2,
      productId: '',
      whyItMatters: 'Marmitas e lacres acompanham cada pedido.',
      suggestionCode: 'ALI_EMB_01',
      fromSuggestion: true
    })
    expect(result.draft.id).toBeUndefined()
  })

  it('mantém catálogo de fallback genérico sem custos obrigatórios', () => {
    expect(GENERIC_SEGMENT_FALLBACK.fallbackUsed).toBe(true)
    expect(GENERIC_SEGMENT_FALLBACK.costSuggestions.every((item) => item.mandatory === false)).toBe(true)
  })

  it('entrega a sugestão só uma vez: depois de consumida, a aba reabre sem formulário e sem duplicar o custo', () => {
    const pending = { nonce: 1, kind: 'fixed', draft: { name: 'DAS', amount: 76.9 } }

    expect(costManagerSlot(pending, 'fixed')).toEqual({ key: 'fixed-1', initialDraft: pending.draft })
    expect(costManagerSlot(pending, 'variable')).toEqual({ key: 'variable', initialDraft: null })

    const consumed = consumeSuggestionDraft(pending)

    expect(costManagerSlot(consumed, 'fixed')).toEqual({ key: 'fixed-1', initialDraft: null })
    expect(consumeSuggestionDraft(null)).toBeNull()
  })
})
