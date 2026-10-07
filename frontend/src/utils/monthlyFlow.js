const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const PERIOD_OPTIONS = [6, 12]

// '2026-03' -> 'mar/26'
export const formatMonthLabel = (yearMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth || '')
  if (!match) return yearMonth || ''
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return yearMonth
  return `${MONTH_LABELS[monthIndex]}/${match[1].slice(2)}`
}

// Maior valor entre receitas e despesas, usado como topo da escala do gráfico.
export const getChartMax = (months = []) =>
  months.reduce(
    (max, entry) => Math.max(max, Number(entry.revenue) || 0, Number(entry.totalExpenses) || 0),
    0
  )

export const toBarHeight = (value, max) => {
  const amount = Number(value) || 0
  if (max <= 0 || amount <= 0) return 0
  return Math.min(100, (amount / max) * 100)
}

export const hasActivity = (months = []) =>
  months.some((entry) => Number(entry.revenue) > 0 || Number(entry.totalExpenses) > 0)
