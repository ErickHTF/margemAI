import { useState } from 'react'
import {
  Calculator,
  ChevronDown,
  CreditCard,
  Gauge,
  Info,
  LineChart,
  Package,
  Percent,
  Scale,
  Stethoscope,
  Tags,
  Target,
  Telescope,
  Wallet
} from 'lucide-react'
import { Badge, Card } from './ui'
import { formatCurrencyBRL } from '../utils/formatters'
import { formatMonthLabel, getChartMax, toBarHeight } from '../utils/monthlyFlow'
import {
  MEI_SEVERITY_TONE,
  clampPercent,
  formatPercent,
  maxAbs,
  priceComposition,
  scoreTone,
  statusOf
} from '../utils/assistantCards'

const PAYMENT_LABELS = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  DEBITO: 'Débito',
  CREDITO_A_VISTA: 'Crédito à vista',
  CREDITO_PARCELADO: 'Crédito parcelado'
}

const BAR_TONES = {
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  indigo: 'bg-indigo-500',
  slate: 'bg-slate-400'
}

const TEXT_TONES = {
  emerald: 'text-emerald-600',
  amber: 'text-amber-600',
  rose: 'text-rose-600',
  sky: 'text-sky-600',
  slate: 'text-slate-500'
}

const COMPOSITION_TONES = ['bg-slate-500', 'bg-sky-500', 'bg-indigo-500', 'bg-amber-500', 'bg-emerald-500']

const Frame = ({ Icon, title, children }) => (
  <Card inset padding="sm" className="space-y-3">
    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
      <Icon className="h-4 w-4 text-indigo-500" />
      {title}
    </p>
    {children}
  </Card>
)

const Metric = ({ label, value, tone }) => (
  <div className="min-w-0">
    <p className="text-[11px] text-slate-500">{label}</p>
    <p className={`truncate text-base font-bold ${TEXT_TONES[tone] || 'text-slate-900'}`}>{value}</p>
  </div>
)

const ProgressBar = ({ percent, tone = 'indigo' }) => (
  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70">
    <div className={`h-full rounded-full ${BAR_TONES[tone]}`} style={{ width: `${clampPercent(percent)}%` }} />
  </div>
)

const Diagnosis = ({ data }) => {
  const tone = scoreTone(data.score)
  return (
    <Frame Icon={Stethoscope} title="Diagnóstico do negócio">
      <div className="flex items-center gap-4">
        <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4 ${TEXT_TONES[tone]} border-current`}>
          <span className="text-xl font-extrabold leading-none">{data.score}</span>
          <span className="text-[9px] font-semibold text-slate-500">de 100</span>
        </div>
        <div>
          <Badge tone={tone}>{data.level}</Badge>
          <p className="mt-1 text-xs text-slate-500">Nota calculada pelos indicadores avaliados.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {data.indicators.map((indicator) => (
          <li key={indicator.key} className="rounded-lg border border-slate-200 bg-white p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800">{indicator.label}</span>
              <Badge tone={statusOf(indicator.status).tone}>{statusOf(indicator.status).label}</Badge>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-700">{indicator.value}</p>
            {indicator.items?.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
                {indicator.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            <p className="mt-1 text-[11px] text-slate-500">Referência: {indicator.reference}</p>
          </li>
        ))}
      </ul>
    </Frame>
  )
}

const Assumptions = ({ items }) => {
  const [open, setOpen] = useState(false)
  if (!items?.length) return null
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600"
      >
        <Info className="h-3.5 w-3.5" />
        Hipóteses da projeção
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </div>
  )
}

const Projection = ({ data }) => {
  const scale = maxAbs(data.months.map((month) => month.result))
  const scenario = Number(data.priceAdjustmentPercent) !== 0 || Number(data.cardToPixPercent) !== 0
  return (
    <Frame Icon={Telescope} title="Projeção dos próximos meses">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Faturamento previsto" value={formatCurrencyBRL(data.totalRevenue)} />
        <Metric label={scenario ? 'Resultado no cenário' : 'Resultado previsto'} value={formatCurrencyBRL(data.totalResult)}
          tone={Number(data.totalResult) < 0 ? 'rose' : 'emerald'} />
        {scenario && <Metric label="Sem o cenário" value={formatCurrencyBRL(data.baselineTotalResult)} />}
        <Metric label="Tendência" value={`${formatPercent(data.monthlyGrowthPercent)} ao mês`} />
      </div>
      <div className="overflow-x-auto">
        <div className="flex h-28 items-center gap-1.5" style={{ minWidth: `${data.months.length * 36}px` }}>
          {data.months.map((month) => {
            const height = scale > 0 ? (Math.abs(Number(month.result)) / scale) * 50 : 0
            const negative = Number(month.result) < 0
            return (
              <div key={month.month} className="flex h-full flex-1 flex-col items-center" title={`${formatMonthLabel(month.month)}: ${formatCurrencyBRL(month.result)}`}>
                <div className="flex h-1/2 w-full items-end justify-center">
                  {!negative && <div className="w-3/5 rounded-t bg-emerald-500" style={{ height: `${height * 2}%` }} />}
                </div>
                <div className="flex h-1/2 w-full items-start justify-center border-t border-slate-300">
                  {negative && <div className="w-3/5 rounded-b bg-rose-500" style={{ height: `${height * 2}%` }} />}
                </div>
                <span className="mt-1 text-[10px] text-slate-500">{formatMonthLabel(month.month)}</span>
              </div>
            )
          })}
        </div>
      </div>
      {data.capReachMonth
        ? <Badge tone="rose">Nesse ritmo, o teto do MEI é ultrapassado em {formatMonthLabel(data.capReachMonth)}</Badge>
        : <p className="text-[11px] text-slate-500">Faturamento previsto no ano: {formatCurrencyBRL(data.projectedYearRevenue)} de {formatCurrencyBRL(data.annualLimit)} do teto.</p>}
      <Assumptions items={data.assumptions} />
    </Frame>
  )
}

const MonthlyFlow = ({ data }) => {
  const months = data.months || []
  const max = getChartMax(months)
  return (
    <Frame Icon={LineChart} title="Fluxo de caixa mensal">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="Receitas" value={formatCurrencyBRL(data.totalRevenue)} />
        <Metric label="Despesas" value={formatCurrencyBRL(data.totalExpenses)} />
        <Metric label="Resultado" value={formatCurrencyBRL(data.balance)} tone={Number(data.balance) < 0 ? 'rose' : 'emerald'} />
      </div>
      <div className="overflow-x-auto">
        <div className="flex h-28 items-end gap-2" style={{ minWidth: `${months.length * 40}px` }}>
          {months.map((month) => (
            <div key={month.month} className="flex h-full flex-1 flex-col items-center" title={`${formatMonthLabel(month.month)}: ${formatCurrencyBRL(month.balance)}`}>
              <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                <div className="w-2/5 rounded-t bg-emerald-500" style={{ height: `${toBarHeight(month.revenue, max)}%` }} />
                <div className="w-2/5 rounded-t bg-rose-400" style={{ height: `${toBarHeight(month.totalExpenses, max)}%` }} />
              </div>
              <span className="mt-1 text-[10px] text-slate-500">{formatMonthLabel(month.month)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="flex gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Receitas</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-400" />Despesas</span>
      </p>
    </Frame>
  )
}

const MeiCap = ({ data }) => {
  const tone = MEI_SEVERITY_TONE[data.severity] || 'indigo'
  return (
    <Frame Icon={Gauge} title="Teto de faturamento MEI">
      <div className="flex items-end justify-between gap-2">
        <Metric label="Faturado no ano" value={formatCurrencyBRL(data.accumulatedRevenue)} />
        <span className={`text-lg font-extrabold ${TEXT_TONES[tone] || 'text-slate-900'}`}>{formatPercent(data.usagePercent)}</span>
      </div>
      <ProgressBar percent={data.usagePercent} tone={tone} />
      <p className="text-[11px] text-slate-500">
        Teto {data.proRata ? 'proporcional ' : ''}de {formatCurrencyBRL(data.annualLimit)} · restam {formatCurrencyBRL(data.remainingAmount)}
      </p>
    </Frame>
  )
}

const Price = ({ data }) => {
  const parts = priceComposition(data)
  return (
    <Frame Icon={Calculator} title={data.productName ? `Preço ideal · ${data.productName}` : 'Preço ideal (SEBRAE)'}>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Preço mínimo" value={formatCurrencyBRL(data.minimumSellingPrice)} tone="emerald" />
        <Metric label="Lucro por unidade" value={formatCurrencyBRL(data.unitProfit)} />
        <Metric label="Markup" value={Number(data.markup || 0).toLocaleString('pt-BR', { maximumFractionDigits: 4 })} />
        <Metric label="Margem desejada" value={formatPercent(data.desiredMargin)} />
      </div>
      {parts.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {parts.map((part, index) => (
              <div key={part.key} className={COMPOSITION_TONES[index % COMPOSITION_TONES.length]} style={{ width: `${part.share}%` }} title={`${part.label}: ${formatCurrencyBRL(part.value)}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
            {parts.map((part, index) => (
              <span key={part.key} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-sm ${COMPOSITION_TONES[index % COMPOSITION_TONES.length]}`} />
                {part.label} {formatCurrencyBRL(part.value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </Frame>
  )
}

const Discount = ({ data }) => (
  <Frame Icon={Percent} title="Simulação de desconto">
    <div className="grid grid-cols-2 gap-3">
      <Metric label="Preço original" value={formatCurrencyBRL(data.originalPrice)} />
      <Metric label="Preço com desconto" value={formatCurrencyBRL(data.discountedPrice)} />
      <Metric label="Lucro antes" value={formatCurrencyBRL(data.originalProfit)} />
      <Metric label="Lucro depois" value={formatCurrencyBRL(data.discountedProfit)} tone={Number(data.discountedProfit) < 0 ? 'rose' : 'emerald'} />
    </div>
    <Badge tone={data.viable ? 'emerald' : 'rose'}>{data.viable ? 'Desconto viável' : 'Desconto dá prejuízo'}</Badge>
  </Frame>
)

const BreakEven = ({ data }) => (
  <Frame Icon={Target} title="Ponto de equilíbrio">
    <div className="grid grid-cols-2 gap-3">
      <Metric label="Vender por mês" value={`${Number(data.breakEvenQuantity || 0).toLocaleString('pt-BR')} unidades`} tone="indigo" />
      <Metric label="Faturamento mínimo" value={formatCurrencyBRL(data.breakEvenRevenue)} />
      <Metric label="Sobra por unidade" value={formatCurrencyBRL(data.unitContributionMargin)} />
      <Metric label="Custos fixos" value={formatCurrencyBRL(data.totalFixedCosts)} />
    </div>
  </Frame>
)

const SalesSummary = ({ data }) => (
  <Frame Icon={CreditCard} title={`Vendas dos últimos ${data.periodoDias} dias`}>
    <div className="grid grid-cols-3 gap-3">
      <Metric label="Faturamento" value={formatCurrencyBRL(data.faturamentoBruto)} />
      <Metric label="Taxas pagas" value={formatCurrencyBRL(data.taxasPagas)} tone="rose" />
      <Metric label="Líquido" value={formatCurrencyBRL(data.faturamentoLiquido)} tone="emerald" />
    </div>
    <ul className="space-y-2">
      {(data.porFormaDePagamento || []).map((row) => (
        <li key={row.formaPagamento} className="space-y-1">
          <div className="flex justify-between gap-2 text-xs">
            <span className="font-medium text-slate-700">{PAYMENT_LABELS[row.formaPagamento] || row.formaPagamento}</span>
            <span className="text-slate-500">{formatPercent(row.participacaoNoFaturamentoPercentual)} das vendas · taxa {formatPercent(row.taxaEfetivaPercentual)}</span>
          </div>
          <ProgressBar percent={row.participacaoNoFaturamentoPercentual} tone="sky" />
        </li>
      ))}
    </ul>
  </Frame>
)

const Table = ({ Icon, title, columns, rows }) => (
  <Frame Icon={Icon} title={title}>
    {rows.length === 0 ? <p className="text-xs text-slate-500">Nada cadastrado ainda.</p> : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              {columns.map((column) => <th key={column.label} className={`py-1 pr-3 font-medium ${column.align === 'right' ? 'text-right' : ''}`}>{column.label}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={index}>
                {columns.map((column) => (
                  <td key={column.label} className={`py-1.5 pr-3 text-slate-700 ${column.align === 'right' ? 'text-right whitespace-nowrap' : ''}`}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Frame>
)

const RENDERERS = {
  diagnostico_negocio: Diagnosis,
  projecao_futura: Projection,
  fluxo_de_caixa_mensal: MonthlyFlow,
  teto_mei: MeiCap,
  calcular_preco_ideal: Price,
  simular_desconto: Discount,
  ponto_de_equilibrio: BreakEven,
  resumo_vendas: SalesSummary,
  listar_produtos: ({ data }) => (
    <Table Icon={Package} title="Produtos" rows={data} columns={[
      { label: 'Produto', render: (row) => row.nome },
      { label: 'Preço', align: 'right', render: (row) => formatCurrencyBRL(row.precoVenda) },
      { label: 'Margem', align: 'right', render: (row) => formatPercent(row.margemPercentual) }
    ]} />
  ),
  taxas_pagamento: ({ data }) => (
    <Table Icon={CreditCard} title="Taxas de pagamento" rows={data} columns={[
      { label: 'Forma', render: (row) => `${PAYMENT_LABELS[row.formaPagamento] || row.formaPagamento}${row.parcelas > 1 ? ` ${row.parcelas}x` : ''}` },
      { label: 'Taxa', align: 'right', render: (row) => formatPercent(row.taxaPercentual) },
      { label: 'Recomendada', align: 'right', render: (row) => formatPercent(row.taxaPercentualRecomendada) }
    ]} />
  ),
  custos_variaveis: ({ data }) => (
    <Table Icon={Wallet} title="Custos variáveis" rows={data} columns={[
      { label: 'Custo', render: (row) => row.nome },
      { label: 'Produto', render: (row) => row.produto || '—' },
      { label: 'Por unidade', align: 'right', render: (row) => formatCurrencyBRL(row.valorPorUnidade) }
    ]} />
  ),
  padroes_de_preco: ({ data }) => (
    <Table Icon={Tags} title="Padrões de preço" rows={data} columns={[
      { label: 'Padrão', render: (row) => row.nome },
      { label: 'Margem alvo', align: 'right', render: (row) => formatPercent(row.margemAlvoPercentual) },
      { label: 'Impostos', align: 'right', render: (row) => formatPercent(row.impostosPercentual) }
    ]} />
  ),
  resumo_custos_fixos: ({ data }) => (
    <Frame Icon={Scale} title="Custos fixos">
      <div className="grid grid-cols-2 gap-3">
        <Metric label="Total por mês" value={formatCurrencyBRL(data.totalFixedCosts)} />
        <Metric label="Peso no faturamento" value={formatPercent(data.allocatedFixedCostPercent)} tone={data.severeRisk ? 'rose' : undefined} />
      </div>
      {data.riskMessage && <p className="text-[11px] text-slate-600">{data.riskMessage}</p>}
    </Frame>
  )
}

export default function AssistantCards({ cards = [] }) {
  const known = cards.filter((card) => RENDERERS[card.type] && card.data)
  if (known.length === 0) return null
  return (
    <div className="grid gap-3">
      {known.map((card) => {
        const Renderer = RENDERERS[card.type]
        return <Renderer key={card.type} data={card.data} />
      })}
    </div>
  )
}
