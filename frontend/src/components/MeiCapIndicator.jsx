import { AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react'

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-rose-50 border-rose-200 text-rose-900',
    bar: 'bg-rose-600',
    badge: 'bg-rose-100 text-rose-800',
    label: 'Crítico: Teto Excedido',
    Icon: AlertTriangle
  },
  WARNING: {
    bg: 'bg-amber-50 border-amber-200 text-amber-900',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Atenção: Limite Próximo (>= 85%)',
    Icon: AlertCircle
  },
  INFO: {
    bg: 'bg-sky-50 border-sky-200 text-sky-900',
    bar: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-800',
    label: 'Informativo: >= 70% do Teto',
    Icon: Info
  },
  NORMAL: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Faixa Segura (< 70%)',
    Icon: CheckCircle2
  }
}

export default function MeiCapIndicator({ data }) {
  if (!data) return null

  const {
    annualLimit = 81000,
    proRata = false,
    activeMonths = 12,
    accumulatedRevenue = 0,
    usagePercent = 0,
    remainingAmount = 0,
    severity = 'NORMAL',
    recommendationMessage = ''
  } = data

  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.NORMAL
  const Icon = config.Icon
  const clampedPercent = Math.min(Math.max(Number(usagePercent) || 0, 0), 100)

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div
      data-testid="meicap-indicator"
      className={`rounded-2xl p-5 border shadow-sm transition-all ${config.bg}`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <Icon className="w-5 h-5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Monitoramento do Limite de Faturamento MEI</h4>
            {proRata && (
              <span className="text-[11px] font-medium opacity-80">
                Cálculo proporcional ativo: {activeMonths} {activeMonths === 1 ? 'mês' : 'meses'} no ano fiscal
              </span>
            )}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${config.badge}`}>
          {config.label}
        </span>
      </div>

      {/* Barra de Progresso */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-xs font-medium">
          <span>{formatCurrency(accumulatedRevenue)} faturados</span>
          <span>{Number(usagePercent).toFixed(1)}% do teto</span>
        </div>
        <div className="w-full bg-slate-200/70 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.bar}`}
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-500">
          <span>R$ 0,00</span>
          <span>Teto: {formatCurrency(annualLimit)}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-200/50 text-xs">
        <p className="font-medium text-slate-700">{recommendationMessage}</p>
        <span className="font-semibold shrink-0 text-slate-900">
          Restante: {formatCurrency(remainingAmount)}
        </span>
      </div>
    </div>
  )
}

