import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSegments } from './segmentService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('segmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch segments list', async () => {
    const mockSegments = ['COMERCIO', 'SERVICOS', 'INDUSTRIA']
    api.get.mockResolvedValueOnce({ data: mockSegments })

    const result = await getSegments()

    expect(api.get).toHaveBeenCalledWith('/segments')
    expect(result).toEqual(mockSegments)
  })
})
