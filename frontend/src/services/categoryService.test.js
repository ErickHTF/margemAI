import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoryService } from './categoryService'
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

describe('categoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch categories with parameters', async () => {
    const mockData = {
      content: [{ id: '1', name: 'Bebidas', type: 'PRODUTO', targetProfitMargin: 25.0 }],
      totalElements: 1
    }
    api.get.mockResolvedValueOnce({ data: mockData })

    const result = await categoryService.getCategories({ type: 'PRODUTO', page: 0, size: 10 })

    expect(api.get).toHaveBeenCalledWith('/categories', { params: { type: 'PRODUTO', page: 0, size: 10 } })
    expect(result).toEqual(mockData)
  })

  it('should create category', async () => {
    const payload = { name: 'Bebidas', type: 'PRODUTO', targetProfitMargin: 25.0 }
    const mockCreated = { id: '1', slug: 'bebidas', ...payload }
    api.post.mockResolvedValueOnce({ data: mockCreated })

    const result = await categoryService.createCategory(payload)

    expect(api.post).toHaveBeenCalledWith('/categories', payload)
    expect(result).toEqual(mockCreated)
  })

  it('should update category', async () => {
    const payload = { name: 'Bebidas Premium', type: 'PRODUTO' }
    api.put.mockResolvedValueOnce({ data: payload })

    const result = await categoryService.updateCategory('1', payload)

    expect(api.put).toHaveBeenCalledWith('/categories/1', payload)
    expect(result).toEqual(payload)
  })

  it('should patch category status', async () => {
    api.patch.mockResolvedValueOnce({ data: { id: '1', active: false } })

    await categoryService.patchCategoryStatus('1', false)

    expect(api.patch).toHaveBeenCalledWith('/categories/1/status', { active: false })
  })

  it('should delete category', async () => {
    api.delete.mockResolvedValueOnce({})

    await categoryService.deleteCategory('1')

    expect(api.delete).toHaveBeenCalledWith('/categories/1')
  })

  it('should trigger batch price revalidation', async () => {
    const mockResult = { categoryId: '1', updatedProducts: 3 }
    api.post.mockResolvedValueOnce({ data: mockResult })

    const result = await categoryService.revalidatePrices('1')

    expect(api.post).toHaveBeenCalledWith('/categories/1/revalidate-prices')
    expect(result).toEqual(mockResult)
  })
})
