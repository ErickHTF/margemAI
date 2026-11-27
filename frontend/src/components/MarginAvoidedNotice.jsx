import { ShieldCheck, TrendingUp } from 'lucide-react'
import { Badge, Button, Notice } from './ui'
import TipButton from './TipButton'

export default function MarginAvoidedNotice({ avoidedData, onDismiss, className = '' }) {
  if (!avoidedData) return null

  const {
    avoidedLossPerUnit = 0,
    marginRecoveredPoints = 0,
    concept,
    pill
  } = avoidedData

  const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  const formattedMargin = Number(marginRecoveredPoints).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  })

  return (
    <Notice
      tone="emerald"
      size="md"
      role="status"
      aria-live="polite"
      Icon={ShieldCheck}
      className={className}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-emerald-950">
              {concept?.title || 'Decisão de Margem Evitada'}
            </h4>
            <Badge tone="emerald" Icon={TrendingUp}>
              Margem protegida
            </Badge>
          </div>
          {pill && (
            <TipButton
              pill={pill}
              aria-label="Ver conceito SEBRAE sobre preservação de margem"
            />
          )}
        </div>

        <p className="text-xs text-emerald-900 leading-relaxed">
          {concept?.summary || 'Você ajustou a simulação a tempo e preservou a margem de contribuição do produto.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200/80">
            <span className="block text-[11px] font-medium text-emerald-800">
              Prejuízo evitado por unidade:
            </span>
            <span className="text-sm font-extrabold text-emerald-950">
              {formatCurrency(avoidedLossPerUnit)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-100/60 border border-emerald-200/80">
            <span className="block text-[11px] font-medium text-emerald-800">
              Margem recuperada:
            </span>
            <span className="text-sm font-extrabold text-emerald-950">
              +{formattedMargin} p.p.
            </span>
          </div>
        </div>

        <p className="text-[11px] text-emerald-800 italic">
          {concept?.tip || 'Descontos no balcão devem sempre preservar os custos unitários e a margem de contribuição.'}
        </p>

        <div className="pt-1 flex items-center justify-end">
          <Button
            size="sm"
            variant="soft"
            onClick={onDismiss}
            aria-label="Dispensar dica educativa de margem evitada"
          >
            Entendi / Dispensar
          </Button>
        </div>
      </div>
    </Notice>
  )
}
