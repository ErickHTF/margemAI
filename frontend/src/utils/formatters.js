const MAX_DIGITS = 10

export const digitsToCurrency = (digits) => {
  const clean = (digits || '').replace(/\D/g, '').slice(0, MAX_DIGITS)
  if (!clean) return '0,00'

  const cents = parseInt(clean, 10)
  const reais = Math.floor(cents / 100)
  const centavos = String(cents % 100).padStart(2, '0')

  return `${reais.toLocaleString('pt-BR')},${centavos}`
}

export const maskCurrency = (value) => digitsToCurrency(value)

export const currencyToDigits = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return String(Math.round(amount * 100))
}

export const unmaskCurrency = (value) => {
  const clean = (value || '').replace(/\D/g, '')
  if (!clean) return 0
  return Number(clean) / 100
}

export const formatCurrencyBRL = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)

// '2026-09-16T17:46:00' -> '16/09/2026' (data local, sem conversão de fuso)
export const formatDateBR = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '')
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—'
}
