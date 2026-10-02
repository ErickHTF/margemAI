import { describe, it, expect, vi, beforeEach } from 'vitest'
import { operationalService } from './operationalService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn()
  }
}))

describe('operationalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch fixed costs summary', async () => {
    const mockData = {
      totalFixedCosts: 1000.0,
      revenueBaseline: 2000.0,
      allocatedFixedCostPercent: 50.0,
      severeRisk: false
    }
    api.get.mockResolvedValueOnce({ data: mockData })

    const result = await operationalService.getFixedCostsSummary()

    expect(api.get).toHaveBeenCalledWith('/settings/operational/fixed-costs-summary')
    expect(result).toEqual(mockData)
  })

  it('should update rateio config', async () => {
    const payload = { revenueBaselineMode: 'TARGET_REVENUE', monthlyRevenueTarget: 2000.0 }
    api.patch.mockResolvedValueOnce({ data: { allocatedFixedCostPercent: 50.0 } })

    await operationalService.updateRateioConfig(payload)

    expect(api.patch).toHaveBeenCalledWith('/settings/operational/rateio-config', payload)
  })
})
