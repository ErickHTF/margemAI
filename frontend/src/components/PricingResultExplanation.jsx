import { useId, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const currency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
const percent = (value) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)

export default function PricingResultExplanation({ explanation }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  if (!explanation) return null
  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className="w-full p-5 flex items-center justify-between gap-3 text-left text-sm font-semibold text-slate-800 cursor-pointer">
        Como chegamos a este resultado?
        {expanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
      </button>
      <div id={id} hidden={!expanded} className="px-5 pb-5 space-y-3 text-xs text-slate-600">
        <p>Composição da última simulação, com preço de venda de <strong>{currency(explanation.price)}</strong>. Cada percentual abaixo representa uma parte desse preço, e não um acréscimo sobre o custo.</p>
        <dl className="space-y-2">
          {explanation.rows.map((row) => <div key={row.key} className="flex justify-between gap-3 border-b border-slate-100 pb-2"><dt>{row.label} ({percent(row.percent)}%)</dt><dd className="font-semibold text-slate-900 shrink-0">{currency(row.value)}</dd></div>)}
        </dl>
        <p>As despesas variáveis e a taxa percentual aparecem separadas aqui e são contadas uma única vez.</p>
        {explanation.useConfiguredFee ? <p>MDR incluída: {percent(explanation.paymentFeePercent)}%. Tarifa fixa configurada: {currency(explanation.fixedFeeAmount)}. A calculadora atual considera apenas a MDR; a tarifa fixa não está incluída neste resultado.</p> : <p>A inclusão automática da taxa de pagamento está desativada. Eventuais taxas precisam estar contempladas nas despesas informadas.</p>}
        {explanation.estimatedTaxes > 0 && <p className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900">Tributos estimados: {currency(explanation.estimatedTaxes)}. O cálculo atual apresenta o lucro antes de descontar esses tributos; esse valor ainda não é o lucro final disponível.</p>}
        <p>O rateio reserva uma parte do preço para os custos fixos; a cobertura mensal depende também do volume vendido. A estimativa depende dos dados informados e não inclui custos omitidos, perdas ou descontos futuros. Receber o valor da venda após a taxa de pagamento não significa obter esse valor em lucro.</p>
        <p>Alterou os parâmetros? Recalcule para atualizar este resultado.</p>
      </div>
    </div>
  )
}
