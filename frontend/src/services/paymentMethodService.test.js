import { describe, it, expect, vi, beforeEach } from 'vitest'
import { paymentMethodService } from './paymentMethodService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn()
  }
}))

describe('paymentMethodService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve buscar as configurações da matriz de taxas de pagamento', async () => {
    const mockConfigs = [
      {
        paymentMethod: 'DEBITO',
        description: 'Cartão de Débito',
        installments: 1,
        mdrFeePercent: 1.5,
        fixedFeeAmount: 0.0,
        settlementDays: 1,
        isActive: true,
        isCustomized: false
      }
    ]
    api.get.mockResolvedValueOnce({ data: mockConfigs })

    const result = await paymentMethodService.getPaymentMethodConfigs()

    expect(api.get).toHaveBeenCalledWith('/settings/financial/payment-methods')
    expect(result).toEqual(mockConfigs)
  })

  it('deve atualizar as configurações em lote (batch update)', async () => {
    const payload = [
      {
        paymentMethod: 'CREDITO_A_VISTA',
        installments: 1,
        mdrFeePercent: 2.9,
        fixedFeeAmount: 0.35,
        settlementDays: 30,
        isActive: true
      }
    ]
    const mockResponse = [{ ...payload[0], isCustomized: true }]
    api.put.mockResolvedValueOnce({ data: mockResponse })

    const result = await paymentMethodService.updatePaymentMethodConfigs(payload)

    expect(api.put).toHaveBeenCalledWith('/settings/financial/payment-methods', payload)
    expect(result).toEqual(mockResponse)
  })
})
