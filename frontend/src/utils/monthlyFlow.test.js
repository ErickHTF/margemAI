import { describe, it, expect } from 'vitest'
import { formatMonthLabel, getChartMax, toBarHeight, hasActivity, expenseShare } from './monthlyFlow'

describe('monthlyFlow utils', () => {
  it('should format YYYY-MM as abbreviated pt-BR month', () => {
    expect(formatMonthLabel('2026-03')).toBe('mar/26')
    expect(formatMonthLabel('2025-12')).toBe('dez/25')
  })

  it('should return the original value when the month is invalid', () => {
    expect(formatMonthLabel('2026-13')).toBe('2026-13')
    expect(formatMonthLabel('junho')).toBe('junho')
    expect(formatMonthLabel(undefined)).toBe('')
  })

  it('should use the highest revenue or expense as chart max', () => {
    const months = [
      { revenue: 1200, totalExpenses: 800 },
      { revenue: 900, totalExpenses: 1500 },
      { revenue: 0, totalExpenses: 0 }
    ]
    expect(getChartMax(months)).toBe(1500)
    expect(getChartMax([])).toBe(0)
  })

  it('should compute proportional bar heights and clamp invalid values', () => {
    expect(toBarHeight(750, 1500)).toBe(50)
    expect(toBarHeight(1500, 1500)).toBe(100)
    expect(toBarHeight(0, 1500)).toBe(0)
    expect(toBarHeight(-10, 1500)).toBe(0)
    expect(toBarHeight(100, 0)).toBe(0)
  })

  it('should detect when there is any revenue or expense in the period', () => {
    expect(hasActivity([{ revenue: 0, totalExpenses: 0 }])).toBe(false)
    expect(hasActivity([{ revenue: 0, totalExpenses: 50 }])).toBe(true)
    expect(hasActivity([])).toBe(false)
  })

  it('should compute the share of an expense component as a rounded percentage', () => {
    expect(expenseShare(500, 2018)).toBe(25)
    expect(expenseShare(2000, 2018)).toBe(99)
    expect(expenseShare('3.00', '2018.00')).toBe(0)
    expect(expenseShare(0, 100)).toBe(0)
  })

  it('should return null for the expense share when there are no expenses', () => {
    expect(expenseShare(0, 0)).toBeNull()
    expect(expenseShare(10, undefined)).toBeNull()
  })
})
