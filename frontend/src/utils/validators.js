export const maskCnpj = (value) => {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
}

export const validateCnpj = (cnpj) => {
  const cleanCnpj = (cnpj || '').replace(/\D/g, '')
  if (cleanCnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false

  let size = cleanCnpj.length - 2
  let numbers = cleanCnpj.substring(0, size)
  const digits = cleanCnpj.substring(size)
  let sum = 0
  let pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += Number(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== Number(digits.charAt(0))) return false

  size = size + 1
  numbers = cleanCnpj.substring(0, size)
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
