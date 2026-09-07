import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculatePricing, simulateDiscount } from './pricingService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('pricingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call calculate endpoint with correct payload', async () => {
    const mockResponse = {
      data: {
        baseCost: 50.0,
        minimumSellingPrice: 100.0,
        markup: 2.0,
        grossMargin: 50.0,
        unitProfit: 25.0
      }
    }
    api.post.mockResolvedValueOnce(mockResponse)

    const payload = {
      baseCost: 50.0,
      fixedCostPercent: 10.0,
      variableCostPercent: 15.0,
      desiredMargin: 25.0,
      includeFixedCosts: true
    }

    const result = await calculatePricing(payload)

    expect(api.post).toHaveBeenCalledWith('/pricing/calculate', payload)
    expect(result).toEqual(mockResponse.data)
  })

  it('should call simulate discount endpoint with correct payload', async () => {
    const mockResponse = {
      data: {
        originalPrice: 100.0,
        discountPercentage: 10.0,
        discountedPrice: 90.0,
        viable: true
      }
    }
    api.post.mockResolvedValueOnce(mockResponse)

    const payload = {
      sellingPrice: 100.0,
      discountPercentage: 10.0,
      baseCost: 50.0,
      fixedCostPercent: 10.0,
      variableCostPercent: 15.0
    }

    const result = await simulateDiscount(payload)

    expect(api.post).toHaveBeenCalledWith('/pricing/simulate-discount', payload)
    expect(result).toEqual(mockResponse.data)
  })
})
