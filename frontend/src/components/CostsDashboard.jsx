import useDraft from '../hooks/useDraft'
import useApiResource from '../hooks/useApiResource'
import { useState, useEffect } from 'react'
import { Package, Landmark, Wallet, Sparkles, SlidersHorizontal } from 'lucide-react'
import PageHeader from './PageHeader'
import { Badge, Button, Card, Notice, SegmentedControl } from './ui'
import CostManager from './CostManager'
import fixedCostService from '../services/fixedCostService'
import variableCostService from '../services/variableCostService'
import productService from '../services/productService'
import segmentService from '../services/segmentService'
import { formatCurrencyBRL } from '../utils/formatters'
import {
  consumeSuggestionDraft,
  costManagerSlot,
  normalizeSegmentGuidance,
  suggestionToCostDraft
} from '../utils/segmentGuidance'
import { FIXED_COST_CATEGORIES, VARIABLE_COST_CATEGORIES, costCategoryLabel } from '../constants/costCategories'

export default function CostsDashboard() {
  const { guard } = useDraft(null)
  const [activeTab, setActiveTab] = useState('fixed')
  const [products, setProducts] = useState([])
  const [pendingSuggestion, setPendingSuggestion] = useState(null)

  const { data: rawGuidance } = useApiResource(
    () => segmentService.getSegmentGuidance(),
    [],
    { errorMessage: 'Não foi possível carregar as sugestões do seu segmento.' }
  )

  const guidance = normalizeSegmentGuidance(rawGuidance)

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const firstPage = await productService.getProducts({ page: 0, size: 100 })
        const remainingPages = Array.from(
          { length: Math.max((firstPage.totalPages || 1) - 1, 0) },
          (_, index) => productService.getProducts({ page: index + 1, size: 100 })
        )
        const rest = await Promise.all(remainingPages)
        if (!cancelled) {
          setProducts([
            ...(firstPage.content || []),
            ...rest.flatMap((page) => page.content || [])
          ])
        }
      } catch {
        if (!cancelled) setProducts([])
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const handleUseSuggestion = (suggestion) => {
    const converted = suggestionToCostDraft(suggestion)
    if (!converted) return
    guard(() => {
      setActiveTab(converted.kind)
      setPendingSuggestion({
        nonce: Date.now(),
        kind: converted.kind,
        draft: converted.draft
      })
    })
  }

  const tabs = [
    {
      key: 'fixed',
      label: 'Custos Fixos',
      Icon: Landmark
    },
    {
      key: 'variable',
      label: 'Custos Variáveis',
      Icon: Package
    }
  ]

  const fixedSlot = costManagerSlot(pendingSuggestion, 'fixed')
  const variableSlot = costManagerSlot(pendingSuggestion, 'variable')
  const consumeSuggestion = () => setPendingSuggestion(consumeSuggestionDraft)

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={Wallet}
        title="Gestão de Custos"
        description="Registre despesas fixas e custos variáveis, vinculando matéria-prima e embalagem a cada produto."
      />

      <Card padding="md" className="w-full space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Sugestões do seu Segmento: {guidance.segmentName}
              </h2>
              <Badge tone="indigo" Icon={Sparkles}>
                Regras v{guidance.ruleVersion}
              </Badge>
              <Badge tone="emerald">
                100% opcionais
              </Badge>
              {guidance.fallbackUsed && (
                <Badge tone="amber">
                  Catálogo geral MEI
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600">
              {guidance.sebraeGuidanceSummary}
            </p>
          </div>
        </div>

        <Notice tone="sky" size="sm" title="Nenhum custo é criado automaticamente">
          Use as sugestões abaixo apenas como ponto de partida. Ao clicar em &ldquo;Usar como base / Ajustar&rdquo;, você pode alterar descrição, padrão de precificação e valor antes de salvar.
        </Notice>

        <div className="grid gap-4 sm:grid-cols-2">
          {guidance.costSuggestions.map((item) => {
            const isVariable = item.costType === 'VARIABLE'
            const categoryList = isVariable ? VARIABLE_COST_CATEGORIES : FIXED_COST_CATEGORIES
            return (
              <Card key={item.code} tone="muted" inset padding="sm" className="flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-slate-900">{item.name}</p>
                    <Badge tone={isVariable ? 'sky' : 'indigo'}>
                      {isVariable ? 'Custo Variável' : 'Custo Fixo'}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-700">
                    Padrão: {costCategoryLabel(categoryList, item.category)}
                    {item.suggestedAmount != null ? ` • Base sugerida: ${formatCurrencyBRL(item.suggestedAmount)}` : ''}
                    {item.suggestedPercent != null ? ` (${item.suggestedPercent}% ref.)` : ''}
                  </p>
                  <p className="text-xs text-slate-600">
                    {item.whyItMatters}
                  </p>
                </div>
                <div className="pt-1">
                  <Button
                    variant="soft"
                    size="sm"
                    Icon={SlidersHorizontal}
                    onClick={() => handleUseSuggestion(item)}
                  >
                    Usar como base / Ajustar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </Card>

      <SegmentedControl
        data-tour="costs-tabs"
        size="md"
        label="Tipo de custo"
        options={tabs.map(({ key, label, Icon }) => ({ value: key, label, Icon }))}
        value={activeTab}
        onChange={(key) => guard(() => setActiveTab(key))}
      />

      <div data-tour="costs-content">
      {activeTab === 'fixed' && (
        <CostManager
          key={fixedSlot.key}
          kind="fixed"
          service={fixedCostService}
          categories={FIXED_COST_CATEGORIES}
          initialDraft={fixedSlot.initialDraft}
          onInitialDraftConsumed={consumeSuggestion}
        />
      )}
      {activeTab === 'variable' && (
        <CostManager
          key={variableSlot.key}
          kind="variable"
          service={variableCostService}
          categories={VARIABLE_COST_CATEGORIES}
          products={products}
          initialDraft={variableSlot.initialDraft}
          onInitialDraftConsumed={consumeSuggestion}
        />
      )}
      </div>
    </div>
  )
}
