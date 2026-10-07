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
import EducationalPill from './EducationalPill'
import { getPillById } from '../data/sebraePills'

const TAB_OPTIONS = [
  { id: 'all', label: 'Todas as Modalidades' },
  { id: 'sight', label: 'À Vista (Pix, Dinheiro, Débito)' },
  { id: 'credit_sight', label: 'Crédito à Vista' },
  { id: 'installments', label: 'Crédito Parcelado (2x a 12x)' }
]

// Parcelamentos acima deste limite ficam agrupados em uma linha expansível
const VISIBLE_INSTALLMENTS_LIMIT = 3

export default function PaymentMethodSettings() {
  const [configs, setConfigs] = useState([])
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
        if (!cancelled) setConfigs(data || [])
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
      prev.map((item) => {
        let defaultMdr = 0
        let defaultFixed = 0
        let defaultDays = 0

        if (item.paymentMethod === 'DEBITO') {
          defaultMdr = 1.5
          defaultDays = 1
        } else if (item.paymentMethod === 'CREDITO_A_VISTA') {
          defaultMdr = 3.2
          defaultDays = 30
        } else if (item.paymentMethod === 'CREDITO_PARCELADO') {
          const inst = item.installments || 2
          defaultMdr = 4.5 + (inst - 1) * 1.0
          defaultDays = 30
        }

        return {
          ...item,
          mdrFeePercent: defaultMdr,
          fixedFeeAmount: defaultFixed,
          settlementDays: defaultDays,
          isActive: true
        }
      })
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
  const customizedExtraCount = extraInstallments.filter((c) => c.isCustomized).length

  const renderConfigRow = (item) => {
    const originalIndex = configs.findIndex(
      (c) => c.paymentMethod === item.paymentMethod && c.installments === item.installments
    )
    return (
      <tr key={`${item.paymentMethod}-${item.installments}`} className="hover:bg-slate-50/50 transition">
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
          {item.isCustomized ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Personalizado
            </span>
          ) : (
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
              Recomendado
            </span>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Taxas de Pagamento & Liquidação</h1>
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
              Gateway Matrix
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Personalize as taxas da sua maquininha e os prazos de recebimento para calcular o lucro líquido real em cada venda.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
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
            disabled={loading || saving}
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
      </div>

      {/* Pílula SEBRAE de Contexto */}
      {cardFeesPill && (
        <div className="max-w-4xl">
          <EducationalPill pill={cardFeesPill} defaultExpanded={false} />
        </div>
      )}

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
