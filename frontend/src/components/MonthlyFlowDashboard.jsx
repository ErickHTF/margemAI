import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Scale,
  CalendarRange,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react'
import useMonthlyFlow from '../hooks/useMonthlyFlow'
import { formatCurrencyBRL } from '../utils/formatters'
import {
  PERIOD_OPTIONS,
  formatMonthLabel,
  getChartMax,
  toBarHeight,
  hasActivity
} from '../utils/monthlyFlow'

const balanceColor = (value) => (Number(value) < 0 ? 'text-rose-600' : 'text-emerald-600')

const SummaryCard = ({ Icon, iconClass, label, value, valueClass = 'text-slate-900', hint }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="min-w-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <p className={`text-xl font-extrabold mt-0.5 truncate ${valueClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</p>}
    </div>
  </div>
)

export default function MonthlyFlowDashboard() {
  const { flowData, months, changeMonths, loading, error } = useMonthlyFlow()

  const entries = flowData?.months || []
  const chartMax = getChartMax(entries)
  const showChart = hasActivity(entries)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Fluxo de Caixa Mensal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Compare receitas e despesas mês a mês e identifique a sazonalidade do seu negócio.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeMonths(option)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                months === option
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option} meses
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <span className="text-sm font-medium">Carregando histórico do fluxo de caixa...</span>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-rose-600 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      ) : (
        <>
          {/* Cards de resumo do período */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              Icon={TrendingUp}
              iconClass="bg-emerald-50 text-emerald-600"
              label="Receitas"
              value={formatCurrencyBRL(flowData?.totalRevenue)}
              hint={`Média: ${formatCurrencyBRL(flowData?.averageRevenue)}/mês`}
            />
            <SummaryCard
              Icon={TrendingDown}
              iconClass="bg-rose-50 text-rose-600"
              label="Despesas"
              value={formatCurrencyBRL(flowData?.totalExpenses)}
              valueClass="text-rose-600"
              hint={`Média: ${formatCurrencyBRL(flowData?.averageExpenses)}/mês`}
            />
            <SummaryCard
              Icon={Scale}
              iconClass="bg-indigo-50 text-indigo-600"
              label="Resultado"
              value={formatCurrencyBRL(flowData?.balance)}
              valueClass={balanceColor(flowData?.balance)}
              hint={`${formatMonthLabel(flowData?.startMonth)} a ${formatMonthLabel(flowData?.endMonth)}`}
            />
            <SummaryCard
              Icon={CalendarRange}
              iconClass="bg-amber-50 text-amber-600"
              label="Melhor mês"
              value={flowData?.bestMonth ? formatMonthLabel(flowData.bestMonth) : '—'}
              hint={flowData?.worstMonth ? `Pior mês: ${formatMonthLabel(flowData.worstMonth)}` : 'Sem movimentação'}
            />
          </div>

          {/* Gráfico de barras */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-base font-bold text-slate-900">Receitas x Despesas por mês</h2>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  Receitas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-rose-400" />
                  Despesas
                </span>
              </div>
            </div>

            {showChart ? (
              <div className="overflow-x-auto">
                <div
                  className="flex items-end gap-3 sm:gap-4"
                  style={{ minWidth: `${entries.length * 56}px` }}
                >
                  {entries.map((entry) => (
                    <div key={entry.month} className="flex-1 flex flex-col items-center gap-2 min-w-[44px]">
                      <div className="w-full h-56 flex items-end justify-center gap-1 border-b border-slate-200">
                        <div
                          className="w-1/2 max-w-[22px] bg-emerald-500 rounded-t-md transition-all duration-500"
                          style={{ height: `${toBarHeight(entry.revenue, chartMax)}%` }}
                          title={`Receitas ${formatMonthLabel(entry.month)}: ${formatCurrencyBRL(entry.revenue)}`}
                        />
                        <div
                          className="w-1/2 max-w-[22px] bg-rose-400 rounded-t-md transition-all duration-500"
                          style={{ height: `${toBarHeight(entry.totalExpenses, chartMax)}%` }}
                          title={`Despesas ${formatMonthLabel(entry.month)}: ${formatCurrencyBRL(entry.totalExpenses)}`}
                        />
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          entry.month === flowData?.bestMonth ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {formatMonthLabel(entry.month)}
                      </span>
                      <span className={`text-[10px] font-bold ${balanceColor(entry.balance)}`}>
                        {formatCurrencyBRL(entry.balance)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
                <BarChart3 className="w-10 h-10 text-slate-300" />
                <p className="text-sm font-medium">Nenhuma venda ou custo registrado neste período.</p>
                <p className="text-xs">Registre vendas e custos para acompanhar a evolução do seu caixa.</p>
              </div>
            )}
          </div>

          {/* Detalhamento mensal */}
          {showChart && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Detalhamento mensal</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Mês</th>
                      <th className="px-5 py-3 text-right">Receitas</th>
                      <th className="px-5 py-3 text-right">Custos fixos</th>
                      <th className="px-5 py-3 text-right">Custos variáveis</th>
                      <th className="px-5 py-3 text-right">Taxas</th>
                      <th className="px-5 py-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => (
                      <tr key={entry.month} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">
                          {formatMonthLabel(entry.month)}
                          <span className="ml-2 text-[11px] font-medium text-slate-400">
                            {entry.salesCount} {entry.salesCount === 1 ? 'venda' : 'vendas'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-900 whitespace-nowrap">{formatCurrencyBRL(entry.revenue)}</td>
                        <td className="px-5 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrencyBRL(entry.fixedCosts)}</td>
                        <td className="px-5 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrencyBRL(entry.variableCosts)}</td>
                        <td className="px-5 py-3 text-right text-slate-600 whitespace-nowrap">{formatCurrencyBRL(entry.paymentFees)}</td>
                        <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${balanceColor(entry.balance)}`}>
                          {formatCurrencyBRL(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 shrink-0 mt-px" />
            <span>
              Despesas do mês = custos fixos vigentes (recorrentes a partir do mês de cadastro e pontuais no
              mês de vencimento) + custos variáveis dos produtos vendidos + taxas das formas de pagamento.
            </span>
          </p>
        </>
      )}
    </div>
  )
}
