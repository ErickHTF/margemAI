import { useState, useEffect } from 'react'
import {
  CreditCard,
  Percent,
  Banknote,
  Calendar,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { paymentMethodService } from '../services/paymentMethodService'
import TipButton from './TipButton'
import PageHeader from './PageHeader'
import { getPillById } from '../data/sebraePills'

const TAB_OPTIONS = [
  { id: 'all', label: 'Todas as Modalidades' },
  { id: 'sight', label: 'À Vista (Pix, Dinheiro, Débito)' },
  { id: 'credit_sight', label: 'Crédito à Vista' },
  { id: 'installments', label: 'Crédito Parcelado (2x a 12x)' }
]

// Parcelamentos acima deste limite ficam agrupados em uma linha expansível
const VISIBLE_INSTALLMENTS_LIMIT = 3

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

// Avaliado por taxa, comparando os valores atuais (inclusive não salvos) com o padrão recomendado
const isCustomizedConfig = (item) =>
  item.defaultMdrFeePercent == null ? Boolean(item.isCustomized) : !sameFees(item, recommendedValues(item))

export default function PaymentMethodSettings({ onDirtyChange }) {
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
  const unsavedCount = configs.filter(isUnsavedConfig).length
  const hasUnsavedChanges = unsavedCount > 0

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges)
  }, [hasUnsavedChanges, onDirtyChange])

  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange])

  // Protege também contra fechar/recarregar a aba do navegador
  useEffect(() => {
    if (!hasUnsavedChanges) return undefined
    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

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
  // Na aba dedicada ao parcelado, todas as parcelas já aparecem abertas
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
        {/* Modalidade */}
        <td className="py-3.5 px-4 font-semibold text-slate-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
            <span>{item.description}</span>
          </div>
        </td>

        {/* Parcelas */}
        <td className="py-3.5 px-3 text-center">
          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {item.installments ? `${item.installments}x` : '1x'}
          </span>
        </td>

        {/* Taxa MDR % */}
        <td className="py-3.5 px-4">
          <div className="relative max-w-[130px]">
            <input
              type="number"
              step="0.01"
              min="0"
              max="99.99"
              value={item.mdrFeePercent}
              onChange={(e) => handleFieldChange(originalIndex, 'mdrFeePercent', e.target.value)}
              className="w-full pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-xs font-semibold text-slate-800 bg-white"
            />
            <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </td>

        {/* Tarifa Fixa (R$) */}
        <td className="py-3.5 px-4">
          <div className="relative max-w-[130px]">
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.fixedFeeAmount}
              onChange={(e) => handleFieldChange(originalIndex, 'fixedFeeAmount', e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-xs font-semibold text-slate-800 bg-white"
            />
            <span className="text-[11px] font-bold text-slate-400 absolute left-2.5 top-2 pointer-events-none">
              R$
            </span>
          </div>
        </td>

        {/* Prazo Liquidação */}
        <td className="py-3.5 px-4">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="365"
              value={item.settlementDays}
              onChange={(e) => handleFieldChange(originalIndex, 'settlementDays', e.target.value)}
              className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-xs font-semibold text-slate-800 bg-white text-center"
            />
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 shrink-0">
              D+{item.settlementDays || 0}
            </span>
          </div>
        </td>

        {/* Origem / Status */}
        <td className="py-3.5 px-4 text-center">
          {isCustomizedConfig(item) ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Personalizado
            </span>
          ) : (
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              Recomendado
            </span>
          )}
          {isUnsavedConfig(item) && (
            <span className="block mt-1 text-[10px] font-semibold text-amber-600">Não salvo</span>
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
            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
              {extraInstallments.length} opções
            </span>
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
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        Icon={CreditCard}
        title="Taxas de Pagamento & Liquidação"
        tip={<TipButton pill={cardFeesPill} />}
        description="Personalize as taxas da sua maquininha e os prazos de recebimento para calcular o lucro líquido real em cada venda."
      >
        <div className="flex items-center gap-2.5 shrink-0">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              {unsavedCount} {unsavedCount === 1 ? 'alteração não salva' : 'alterações não salvas'}
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={loading || saving}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
            title="Recarregar taxas padrão recomendadas pelo SEBRAE"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Restaurar Padrões
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !hasUnsavedChanges}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </PageHeader>

      {/* Feedback Toast / Alert */}
      {feedback && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-xs border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : feedback.type === 'info'
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : feedback.type === 'info' ? (
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium leading-relaxed">{feedback.message}</span>
        </div>
      )}

      {/* Navegação por Abas */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo Principal */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs">Carregando matriz de taxas de pagamento...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
        </div>
      )}
    </div>
  )
}
