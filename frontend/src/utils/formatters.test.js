import { describe, it, expect } from 'vitest'
import { formatDateBR } from './formatters'

describe('formatters', () => {
  it('should format ISO dates and date-times as dd/mm/yyyy', () => {
    expect(formatDateBR('2026-09-16T17:46:00')).toBe('16/09/2026')
    expect(formatDateBR('2026-01-05')).toBe('05/01/2026')
  })

  it('should return a dash for missing or invalid dates', () => {
    expect(formatDateBR(null)).toBe('—')
    expect(formatDateBR(undefined)).toBe('—')
    expect(formatDateBR('16/09/2026')).toBe('—')
  })
})
