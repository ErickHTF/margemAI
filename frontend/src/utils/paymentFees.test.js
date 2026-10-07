import { describe, it, expect } from 'vitest'
import { getDefaultFeePercent, resolvePaymentFee, calculateSaleFee, formatFeePercent } from './paymentFees'

const matrix = [
  { paymentMethod: 'DEBITO', installments: 1, mdrFeePercent: 1.25, fixedFeeAmount: 0.2, settlementDays: 1, isActive: true },
  { paymentMethod: 'CREDITO_PARCELADO', installments: 3, mdrFeePercent: 7.9, fixedFeeAmount: 0, settlementDays: 30, isActive: true },
  { paymentMethod: 'CREDITO_A_VISTA', installments: 1, mdrFeePercent: 9.99, fixedFeeAmount: 0, settlementDays: 30, isActive: false }
]

describe('paymentFees', () => {
  it('should mirror backend defaults, including installment step', () => {
    expect(getDefaultFeePercent('PIX')).toBe(0)
    expect(getDefaultFeePercent('DEBITO')).toBe(1.5)
    expect(getDefaultFeePercent('CREDITO_PARCELADO', 2)).toBe(5.5)
    expect(getDefaultFeePercent('CREDITO_PARCELADO', 12)).toBe(15.5)
  })

  it('should resolve the configured fee from the matrix', () => {
    expect(resolvePaymentFee(matrix, 'DEBITO')).toEqual({
      mdrFeePercent: 1.25,
      fixedFeeAmount: 0.2,
      settlementDays: 1,
      source: 'configured'
    })
    expect(resolvePaymentFee(matrix, 'CREDITO_PARCELADO', 3).mdrFeePercent).toBe(7.9)
  })

  it('should fall back to defaults when config is missing or inactive', () => {
    expect(resolvePaymentFee(matrix, 'CREDITO_A_VISTA')).toMatchObject({ mdrFeePercent: 3.2, source: 'default' })
    expect(resolvePaymentFee([], 'CREDITO_PARCELADO', 4)).toMatchObject({ mdrFeePercent: 7.5, source: 'default' })
    expect(resolvePaymentFee(null, 'PIX')).toMatchObject({ mdrFeePercent: 0, source: 'default' })
  })

  it('should calculate fee with percentage plus fixed fee, rounding like the backend', () => {
    const fee = resolvePaymentFee(matrix, 'DEBITO')
    expect(calculateSaleFee({ quantity: 3, unitPrice: 33.33, fee })).toEqual({
      gross: 99.99,
      feePercent: 1.25,
      fixedFee: 0.2,
      feeAmount: 1.45,
      netAmount: 98.54
    })
  })

  it('should ignore fixed fee when a one-off custom fee is informed', () => {
    const fee = resolvePaymentFee(matrix, 'DEBITO')
    expect(calculateSaleFee({ quantity: 1, unitPrice: 100, fee, customFeePercent: '2.99' })).toMatchObject({
      feePercent: 2.99,
      fixedFee: 0,
      feeAmount: 2.99,
      netAmount: 97.01
    })
  })

  it('should return zeros for empty sales', () => {
    expect(calculateSaleFee({ quantity: 0, unitPrice: 10, fee: null }).feeAmount).toBe(0)
  })

  it('should format percentages in pt-BR', () => {
    expect(formatFeePercent(1.5)).toBe('1,5%')
    expect(formatFeePercent(6.25)).toBe('6,25%')
  })
})
