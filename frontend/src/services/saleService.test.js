import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saleService } from './saleService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('saleService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch sales with parameters', async () => {
    const mockData = {
      totalGrossRevenue: 100.0,
      totalFeeAmount: 3.2,
      totalNetRevenue: 96.8,
      totalSalesCount: 1,
      sales: { content: [{ id: 'sale-1', grossAmount: 100.0 }] }
    }
    api.get.mockResolvedValueOnce({ data: mockData })

    const result = await saleService.getSales({ paymentMethod: 'CREDITO_A_VISTA', page: 0, size: 10 })

    expect(api.get).toHaveBeenCalledWith('/sales', { params: { paymentMethod: 'CREDITO_A_VISTA', page: 0, size: 10 } })
    expect(result).toEqual(mockData)
  })

  it('should fetch sale by id', async () => {
    const mockSale = { id: 'sale-123', grossAmount: 50.0 }
    api.get.mockResolvedValueOnce({ data: mockSale })

    const result = await saleService.getSale('sale-123')

    expect(api.get).toHaveBeenCalledWith('/sales/sale-123')
    expect(result).toEqual(mockSale)
  })

  it('should create sale', async () => {
    const payload = {
      productId: 'prod-1',
      quantity: 2,
      paymentMethod: 'DEBITO'
    }
    const mockResponse = { id: 'sale-new', ...payload, netAmount: 35.46 }
    api.post.mockResolvedValueOnce({ data: mockResponse })

    const result = await saleService.createSale(payload)

    expect(api.post).toHaveBeenCalledWith('/sales', payload)
    expect(result).toEqual(mockResponse)
  })

  it('should update sale', async () => {
    const payload = {
      quantity: 3,
      paymentMethod: 'PIX'
    }
    const mockResponse = { id: 'sale-123', ...payload, grossAmount: 150.0 }
    api.put.mockResolvedValueOnce({ data: mockResponse })

    const result = await saleService.updateSale('sale-123', payload)

    expect(api.put).toHaveBeenCalledWith('/sales/sale-123', payload)
    expect(result).toEqual(mockResponse)
  })

  it('should delete sale by id', async () => {
    api.delete.mockResolvedValueOnce({})

    await saleService.deleteSale('sale-123')

    expect(api.delete).toHaveBeenCalledWith('/sales/sale-123')
  })
})
