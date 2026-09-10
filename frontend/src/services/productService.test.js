import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productService } from './productService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}))

describe('productService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch products with parameters', async () => {
    const mockData = {
      content: [{ id: '1', name: 'Camiseta', type: 'PRODUTO', sellingPrice: 50.0 }],
      totalElements: 1
    }
    api.get.mockResolvedValueOnce({ data: mockData })

    const result = await productService.getProducts({ type: 'PRODUTO', page: 0, size: 10 })

    expect(api.get).toHaveBeenCalledWith('/products', { params: { type: 'PRODUTO', page: 0, size: 10 } })
    expect(result).toEqual(mockData)
  })

  it('should fetch product by id', async () => {
    const mockProduct = { id: '123', name: 'Camiseta' }
    api.get.mockResolvedValueOnce({ data: mockProduct })

    const result = await productService.getProduct('123')

    expect(api.get).toHaveBeenCalledWith('/products/123')
    expect(result).toEqual(mockProduct)
  })

  it('should create product', async () => {
    const payload = { name: 'Camiseta', type: 'PRODUTO', sellingPrice: 50.0 }
    const mockCreated = { id: '1', ...payload }
    api.post.mockResolvedValueOnce({ data: mockCreated })

    const result = await productService.createProduct(payload)

    expect(api.post).toHaveBeenCalledWith('/products', payload)
    expect(result).toEqual(mockCreated)
  })

  it('should update product', async () => {
    const payload = { name: 'Camiseta Atualizada', type: 'PRODUTO', sellingPrice: 55.0 }
    api.put.mockResolvedValueOnce({ data: payload })

    const result = await productService.updateProduct('1', payload)

    expect(api.put).toHaveBeenCalledWith('/products/1', payload)
    expect(result).toEqual(payload)
  })

  it('should delete product', async () => {
    api.delete.mockResolvedValueOnce({})

    await productService.deleteProduct('1')

    expect(api.delete).toHaveBeenCalledWith('/products/1')
  })
})
