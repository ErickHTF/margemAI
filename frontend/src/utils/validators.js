export const maskCnpj = (value) => {
  const chars = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)
  if (chars.length <= 2) return chars
  if (chars.length <= 5) return `${chars.slice(0, 2)}.${chars.slice(2)}`
  if (chars.length <= 8) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5)}`
  if (chars.length <= 12) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8)}`
  return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8, 12)}-${chars.slice(12, 14)}`
}

export const validateCnpj = (cnpj) => {
  const clean = (cnpj || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (clean.length !== 14) return false
  if (/^([A-Z0-9])\1{13}$/.test(clean)) return false

  const isNumericOnly = /^\d{14}$/.test(clean)
  if (!isNumericOnly) {
    return /^[A-Z0-9]{14}$/.test(clean)
  }

  let size = clean.length - 2
  let numbers = clean.substring(0, size)
  const digits = clean.substring(size)
  let sum = 0
  let pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number(digits.charAt(0))) return false

  size = size + 1
  numbers = clean.substring(0, size)
  sum = 0
  pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === Number(digits.charAt(1))
}

export const validatePasswordStrength = (password) => {
  const pwd = password || ''
  const hasMinLength = pwd.length >= 8 && pwd.length <= 128
  const hasLowerCase = /[a-z]/.test(pwd)
  const hasUpperCase = /[A-Z]/.test(pwd)
  const hasNumber = /\d/.test(pwd)
  const hasSpecialChar = /[@$!%*?&#^()_+\-=]/.test(pwd)

  const isValid = hasMinLength && hasLowerCase && hasUpperCase && hasNumber && hasSpecialChar

  return {
    isValid,
    rules: {
      minLength: hasMinLength,
      lowerCase: hasLowerCase,
      upperCase: hasUpperCase,
      number: hasNumber,
      specialChar: hasSpecialChar
    }
  }
}

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email || '')
}

export const validateName = (name) => {
  const trimmed = (name || '').trim()
  return trimmed.length >= 2 && trimmed.length <= 150
}
