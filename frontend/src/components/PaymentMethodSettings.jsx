import { useState, useEffect } from 'react'
import {
  CreditCard,
  Percent,
  Save,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { paymentMethodService } from '../services/paymentMethodService'
import TipButton from './TipButton'
import PageHeader from './PageHeader'
import { Badge, Button, Card, EmptyState, Input, Notice, SegmentedControl } from './ui'
import useDraft from '../hooks/useDraft'
import { getPillById } from '../data/sebraePills'
import { formatFeePercent } from '../utils/paymentFees'
import { formatCurrencyBRL } from '../utils/formatters'

const TAB_OPTIONS = [
  { id: 'all', label: 'Todas as Modalidades' },
  { id: 'sight', label: 'À Vista (Pix, Dinheiro, Débito)' },
  { id: 'credit_sight', label: 'Crédito à Vista' },
  { id: 'installments', label: 'Crédito Parcelado (2x a 12x)' }
]

const VISIBLE_INSTALLMENTS_LIMIT = 3

const FEEDBACK_TONES = { success: 'emerald', info: 'sky', error: 'rose' }

const configKey = (item) => `${item.paymentMethod}-${item.installments}`
const toCents = (value) => Math.round(parseFloat(value || 0) * 100)
const toDays = (value) => parseInt(value || 0, 10)

const sameFees = (a, b) =>
  toCents(a.mdrFeePercent) === toCents(b.mdrFeePercent) &&
  toCents(a.fixedFeeAmount) === toCents(b.fixedFeeAmount) &&
  toDays(a.settlementDays) === toDays(b.settlementDays)

const recommendedValues = (item) => ({
  mdrFeePercent: item.defaultMdrFeePercent,
  fixedFeeAmount: item.defaultFixedFeeAmount,
  settlementDays: item.defaultSettlementDays
})

const describeRecommended = (item) =>
  `${formatFeePercent(item.defaultMdrFeePercent)} + ${formatCurrencyBRL(item.defaultFixedFeeAmount)} · D+${
    toDays(item.defaultSettlementDays)
  }`

const isCustomizedConfig = (item) =>
  item.defaultMdrFeePercent == null ? Boolean(item.isCustomized) : !sameFees(item, recommendedValues(item))

export default function PaymentMethodSettings() {
  const [configs, setConfigs] = useState([])
  const [savedConfigs, setSavedConfigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [showExtraInstallments, setShowExtraInstallments] = useState(false)

  const cardFeesPill = getPillById('card-fees')

  useEffect(() => {
    let cancelled = false
    const fetchConfigs = async () => {
      try {
        const data = await paymentMethodService.getPaymentMethodConfigs()
        if (!cancelled) {
          setConfigs(data || [])
          setSavedConfigs(data || [])
        }
      } catch (err) {
        console.error('Erro ao carregar taxas de pagamento:', err)
        if (!cancelled) {
          setFeedback({
            type: 'error',
            message: 'Não foi possível carregar a tabela de taxas. Tente novamente mais tarde.'
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchConfigs()
    return () => {
      cancelled = true
    }
  }, [])

  const savedByKey = new Map(savedConfigs.map((c) => [configKey(c), c]))
  const isUnsavedConfig = (item) => {
    const saved = savedByKey.get(configKey(item))
    return !saved || !sameFees(item, saved)
  }
  const { dirty: hasUnsavedChanges, changes: unsavedCount } = useDraft(configs.filter(isUnsavedConfig).map(configKey), [])

  const handleFieldChange = (index, field, value) => {
    setConfigs((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        [field]: value
      }
      return updated
    })
  }

  const handleRestoreRecommended = (index) => {
    setConfigs((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...recommendedValues(updated[index]) }
      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    try {
      const payload = configs.map((c) => ({
        paymentMethod: c.paymentMethod,
        installments: c.installments || 1,
        mdrFeePercent: parseFloat(c.mdrFeePercent || 0),
        fixedFeeAmount: parseFloat(c.fixedFeeAmount || 0),
        settlementDays: parseInt(c.settlementDays || 0, 10),
        isActive: c.isActive !== false
      }))

      const updated = await paymentMethodService.updatePaymentMethodConfigs(payload)
      setConfigs(updated)
      setSavedConfigs(updated)
      setFeedback({
        type: 'success',
        message: 'Matriz de taxas e prazos de liquidação atualizada com sucesso!'
      })
    } catch (err) {
      console.error('Erro ao salvar taxas de pagamento:', err)
      const msg = err.response?.data?.message || 'Falha ao salvar configurações de taxas.'
      setFeedback({
        type: 'error',
        message: msg
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetDefaults = () => {
    setConfigs((prev) =>
      prev.map((item) =>
        item.defaultMdrFeePercent == null ? item : { ...item, ...recommendedValues(item), isActive: true }
      )
    )
    setFeedback({
      type: 'info',
      message: 'Valores padrão do SEBRAE carregados. Clique em "Salvar Alterações" para confirmar.'
    })
  }

  const filteredConfigs = configs.filter((item) => {
    if (activeTab === 'sight') {
      return ['DINHEIRO', 'PIX', 'DEBITO'].includes(item.paymentMethod)
    }
    if (activeTab === 'credit_sight') {
      return item.paymentMethod === 'CREDITO_A_VISTA'
    }
    if (activeTab === 'installments') {
      return item.paymentMethod === 'CREDITO_PARCELADO'
    }
    return true
  })

  const isExtraInstallment = (item) =>
    item.paymentMethod === 'CREDITO_PARCELADO' && (item.installments || 1) > VISIBLE_INSTALLMENTS_LIMIT
  const extraInstallments = filteredConfigs.filter(isExtraInstallment)
  const firstExtraIndex = filteredConfigs.findIndex(isExtraInstallment)
  const extraInstallmentsExpanded = activeTab === 'installments' || showExtraInstallments
  const extraFees = extraInstallments.map((c) => parseFloat(c.mdrFeePercent || 0))
  const extraInstallmentNumbers = extraInstallments.map((c) => c.installments)
  const customizedExtraCount = extraInstallments.filter(isCustomizedConfig).length

  const renderConfigRow = (item) => {
    const originalIndex = configs.findIndex(
      (c) => c.paymentMethod === item.paymentMethod && c.installments === item.installments
    )
    return (
      <tr key={configKey(item)} className="hover:bg-slate-50/50 transition">
        <td className="py-3.5 px-4 font-semibold text-slate-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>{item.description}</span>
          </div>
        </td>

        <td className="py-3.5 px-3 text-center">
          <Badge>{item.installments ? `${item.installments}x` : '1x'}</Badge>
        </td>

        <td className="py-3.5 px-4">
          <Input
            size="sm"
            TrailingIcon={Percent}
            className="max-w-[130px]"
            type="number"
            step="0.01"
            min="0"
            max="99.99"
            aria-label={`Taxa MDR (%) de ${item.description} ${item.installments || 1}x`}
            value={item.mdrFeePercent}
            onChange={(e) => handleFieldChange(originalIndex, 'mdrFeePercent', e.target.value)}
          />
        </td>

        <td className="py-3.5 px-4">
          <Input
            size="sm"
            prefix="R$"
            className="max-w-[130px]"
            type="number"
            step="0.01"
            min="0"
            aria-label={`Tarifa fixa (R$) de ${item.description} ${item.installments || 1}x`}
            value={item.fixedFeeAmount}
            onChange={(e) => handleFieldChange(originalIndex, 'fixedFeeAmount', e.target.value)}
          />
        </td>

        <td className="py-3.5 px-4">
          <div className="flex items-center gap-2">
            <Input
              size="sm"
              className="w-16 text-center"
              type="number"
              min="0"
              max="365"
              aria-label={`Prazo de liquidação (dias) de ${item.description} ${item.installments || 1}x`}
              value={item.settlementDays}
              onChange={(e) => handleFieldChange(originalIndex, 'settlementDays', e.target.value)}
            />
            <Badge tone="indigo">D+{item.settlementDays || 0}</Badge>
          </div>
        </td>

        <td className="py-3.5 px-4 text-center">
          {isCustomizedConfig(item) ? (
            <Badge tone="emerald" Icon={Sparkles}>Personalizado</Badge>
          ) : (
            <Badge>Recomendado</Badge>
          )}
          {isCustomizedConfig(item) && item.defaultMdrFeePercent != null && (
            <Button
              variant="link"
              size="sm"
              Icon={RotateCcw}
              className="mt-1"
              onClick={() => handleRestoreRecommended(originalIndex)}
              disabled={saving}
              title={`Voltar ao recomendado: ${describeRecommended(item)}`}
              aria-label={`Usar valores recomendados para ${item.description} ${
                item.installments || 1
              }x: ${describeRecommended(item)}`}
            >
              Usar recomendado
            </Button>
          )}
          {isUnsavedConfig(item) && (
            <div className="mt-1"><Badge tone="amber">Não salvo</Badge></div>
          )}
        </td>
      </tr>
    )
  }

  const renderExtraInstallmentsToggle = () => (
    <tr key="extra-installments-toggle" className="bg-slate-50/60">
      <td colSpan={6} className="p-0">
        <button
          type="button"
          onClick={() => setShowExtraInstallments((prev) => !prev)}
          aria-expanded={extraInstallmentsExpanded}
          className="w-full flex items-center justify-between gap-3 py-3 px-4 text-left hover:bg-slate-100/70 transition cursor-pointer"
        >
          <span className="flex items-center gap-2 font-semibold text-slate-700">
            {extraInstallmentsExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
            )}
            Crédito Parcelado de {Math.min(...extraInstallmentNumbers)}x a {Math.max(...extraInstallmentNumbers)}x
            <Badge>{extraInstallments.length} opções</Badge>
          </span>
          <span className="text-[11px] text-slate-500 shrink-0">
            {extraInstallmentsExpanded
              ? 'Recolher'
              : `Taxas de ${Math.min(...extraFees).toFixed(2)}% a ${Math.max(...extraFees).toFixed(2)}%${
                  customizedExtraCount > 0 ? ` · ${customizedExtraCount} personalizada(s)` : ''
                }`}
          </span>
        </button>
      </td>
    </tr>
  )

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={CreditCard}
        title="Taxas de Pagamento & Liquidação"
        tip={<TipButton pill={cardFeesPill} />}
        description="Personalize as taxas da sua maquininha e os prazos de recebimento para calcular o lucro líquido real em cada venda."
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {hasUnsavedChanges && (
            <Badge tone="amber" role="status">
              {unsavedCount} {unsavedCount === 1 ? 'alteração não salva' : 'alterações não salvas'}
            </Badge>
          )}
          <Button
            variant="secondary"
            size="sm"
            Icon={RotateCcw}
            onClick={handleResetDefaults}
            disabled={loading || saving}
            title="Recarregar taxas padrão recomendadas pelo SEBRAE"
          >
            Restaurar Padrões
          </Button>
          <Button
            size="sm"
            Icon={Save}
            loading={saving}
            data-tour="fees-save"
            onClick={handleSave}
            disabled={loading || !hasUnsavedChanges}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </PageHeader>

      {feedback && (
        <Notice size="sm" tone={FEEDBACK_TONES[feedback.type]}>
          <span className="font-medium">{feedback.message}</span>
        </Notice>
      )}

      <SegmentedControl
        data-tour="fees-tabs"
        label="Filtrar modalidades de pagamento"
        options={TAB_OPTIONS.map((tab) => ({ value: tab.id, label: tab.label }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <Card padding="none">
          <EmptyState loading title="Carregando matriz de taxas de pagamento..." />
        </Card>
      ) : (
        <Card padding="none" data-tour="fees-table" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Modalidade de Pagamento</th>
                  <th className="py-3 px-3 text-center">Parcelas</th>
                  <th className="py-3 px-4">Taxa Operadora (MDR %)</th>
                  <th className="py-3 px-4">Tarifa Fixa (R$)</th>
                  <th className="py-3 px-4">Liquidação (Prazo)</th>
                  <th className="py-3 px-4 text-center">Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredConfigs.map((item, index) => {
                  if (!isExtraInstallment(item)) return renderConfigRow(item)
                  if (extraInstallmentsExpanded) {
                    return index === firstExtraIndex && activeTab !== 'installments'
                      ? [renderExtraInstallmentsToggle(), renderConfigRow(item)]
                      : renderConfigRow(item)
                  }
                  return index === firstExtraIndex ? renderExtraInstallmentsToggle() : null
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
