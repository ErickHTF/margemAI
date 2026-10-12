import { describe, it, expect } from 'vitest'
import fixture from '../../../shared/fixtures/payment-fees.json'
import { resolvePaymentFee, calculateSaleFee } from './paymentFees'

// Mesmos casos executados no backend por PaymentFeeSharedCasesTest.
// A matriz chega como números, como na resposta de GET /settings/financial/payment-methods.
const toMatrix = (entries) =>
  entries.map((entry) => ({
    ...entry,
    mdrFeePercent: Number(entry.mdrFeePercent),
    fixedFeeAmount: Number(entry.fixedFeeAmount)
  }))

describe('paymentFees — casos compartilhados com o backend', () => {
  it('should load the shared fixture', () => {
    expect(fixture.cases.length).toBeGreaterThan(0)
  })

  it.each(fixture.cases.map((c) => [c.description, c]))('%s', (_description, { input, expected }) => {
    const fee = resolvePaymentFee(toMatrix(input.matrix), input.paymentMethod, input.installments ?? undefined)
    const result = calculateSaleFee({
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      fee,
      customFeePercent: input.customFeePercent
    })

    expect({
      gross: result.gross,
      feePercent: result.feePercent,
      fixedFee: result.fixedFee,
      feeAmount: result.feeAmount,
      netAmount: result.netAmount
    }).toEqual({
      gross: Number(expected.gross),
      feePercent: Number(expected.feePercent),
      fixedFee: Number(expected.fixedFee),
      feeAmount: Number(expected.feeAmount),
      netAmount: Number(expected.netAmount)
    })
  })
})
