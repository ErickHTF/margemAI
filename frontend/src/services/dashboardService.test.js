import { describe, it, expect, vi, beforeEach } from 'vitest'
import dashboardService from './dashboardService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar GET /dashboard/monthly-flow com parâmetros e retornar dados', async () => {
    const mockData = {
      startMonth: '2026-01',
      endMonth: '2026-06',
      months: [{ month: '2026-01', revenue: 1000, totalExpenses: 600, balance: 400 }]
    }
    api.get.mockResolvedValueOnce({ data: mockData })

    const result = await dashboardService.getMonthlyFlow({ months: 6 })

    expect(api.get).toHaveBeenCalledWith('/dashboard/monthly-flow', {
      params: { months: 6 }
    })
    expect(result).toEqual(mockData)
  })

  it('deve chamar sem parâmetros quando nenhum filtro for informado', async () => {
    api.get.mockResolvedValueOnce({ data: { months: [] } })

    await dashboardService.getMonthlyFlow()

    expect(api.get).toHaveBeenCalledWith('/dashboard/monthly-flow', { params: {} })
  })
})
