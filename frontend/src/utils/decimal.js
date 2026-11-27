const pow10 = (exponent) => 10n ** BigInt(exponent)

export const toDecimal = (value) => {
  if (value === null || value === undefined) return null
  let text = typeof value === 'number' ? (Number.isFinite(value) ? value.toString() : '') : String(value).trim()
  if (/e/i.test(text)) text = Number(text).toFixed(20)
  const match = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(text)
  if (!match || (match[2] === '' && !match[3])) return null
  const [, sign, integer, fraction = ''] = match
  const digits = BigInt(`${integer || '0'}${fraction}`)
  return { digits: sign === '-' ? -digits : digits, scale: fraction.length }
}

const rescale = (decimal, scale) => decimal.digits * pow10(scale - decimal.scale)

export const multiply = (a, b) => ({ digits: a.digits * b.digits, scale: a.scale + b.scale })

export const add = (a, b) => {
  const scale = Math.max(a.scale, b.scale)
  return { digits: rescale(a, scale) + rescale(b, scale), scale }
}

export const subtract = (a, b) => add(a, { digits: -b.digits, scale: b.scale })

export const divideByPowerOfTen = (decimal, exponent) => ({ digits: decimal.digits, scale: decimal.scale + exponent })

export const roundHalfUp = (decimal, scale = 2) => {
  if (decimal.scale <= scale) return { digits: rescale(decimal, scale), scale }
  const factor = pow10(decimal.scale - scale)
  const negative = decimal.digits < 0n
  const absolute = negative ? -decimal.digits : decimal.digits
  const rounded = absolute / factor + ((absolute % factor) * 2n >= factor ? 1n : 0n)
  return { digits: negative ? -rounded : rounded, scale }
}

export const toNumber = (decimal) => {
  const negative = decimal.digits < 0n
  const text = (negative ? -decimal.digits : decimal.digits).toString().padStart(decimal.scale + 1, '0')
  const integer = text.slice(0, text.length - decimal.scale)
  const fraction = text.slice(text.length - decimal.scale)
  return Number(`${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`)
}

export const roundMoney = (value) => {
  const decimal = toDecimal(value)
  return decimal ? toNumber(roundHalfUp(decimal)) : 0
}
