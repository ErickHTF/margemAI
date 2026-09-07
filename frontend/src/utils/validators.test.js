import { describe, it, expect } from 'vitest'
import { maskCnpj, validateCnpj, validatePasswordStrength, validateEmail, validateName } from './validators'

describe('validators', () => {
  describe('maskCnpj', () => {
    it('should format 14 digit numeric CNPJ correctly', () => {
      expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81')
    })

    it('should handle partial input', () => {
      expect(maskCnpj('1122')).toBe('11.22')
    })
  })

  describe('validateCnpj', () => {
    it('should validate valid numeric CNPJ', () => {
      expect(validateCnpj('11222333000181')).toBe(true)
      expect(validateCnpj('11.222.333/0001-81')).toBe(true)
    })

    it('should reject invalid CNPJ', () => {
      expect(validateCnpj('11111111111111')).toBe(false)
      expect(validateCnpj('123')).toBe(false)
      expect(validateCnpj('11222333000199')).toBe(false)
    })
  })

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = validatePasswordStrength('StrongPass123!')
      expect(result.isValid).toBe(true)
      expect(result.rules.minLength).toBe(true)
      expect(result.rules.lowerCase).toBe(true)
      expect(result.rules.upperCase).toBe(true)
      expect(result.rules.number).toBe(true)
      expect(result.rules.specialChar).toBe(true)
    })

    it('should reject weak password missing special char', () => {
      const result = validatePasswordStrength('WeakPass123')
      expect(result.isValid).toBe(false)
      expect(result.rules.specialChar).toBe(false)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@margemai.com')).toBe(true)
    })

    it('should reject invalid email', () => {
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('test')).toBe(false)
    })
  })

  describe('validateName', () => {
    it('should validate valid name', () => {
      expect(validateName('João Silva')).toBe(true)
    })

    it('should reject too short name', () => {
      expect(validateName('J')).toBe(false)
      expect(validateName('')).toBe(false)
    })
  })
})
