import { describe, it, expect, vi, beforeEach } from 'vitest'
import alertService from './alertService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('alertService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar GET /alerts/mei-cap com parâmetros e retornar dados', async () => {
    const mockData = {
      annualLimit: 81000.0,
      usagePercent: 65.5,
      severity: 'NORMAL'
    }
    api.get.mockResolvedValueOnce({ data: mockData })

    const result = await alertService.getMeiCapStatus({ accumulatedRevenue: 50000 })

    expect(api.get).toHaveBeenCalledWith('/alerts/mei-cap', {
      params: { accumulatedRevenue: 50000 }
    })
    expect(result).toEqual(mockData)
  })
})
