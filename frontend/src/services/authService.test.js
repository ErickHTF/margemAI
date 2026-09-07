import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from './authService'
import api from './api'

vi.mock('./api', () => ({
  default: {
    post: vi.fn()
  }
}))

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call register endpoint with user data', async () => {
    const mockData = { id: 1, name: 'MEI User', email: 'mei@example.com' }
    api.post.mockResolvedValueOnce({ data: mockData })

    const payload = { name: 'MEI User', email: 'mei@example.com', password: 'Password123!' }
    const result = await authService.register(payload)

    expect(api.post).toHaveBeenCalledWith('/auth/register', payload)
    expect(result).toEqual(mockData)
  })

  it('should call login endpoint with credentials', async () => {
    const mockData = { accessToken: 'token-123', refreshToken: 'ref-123' }
    api.post.mockResolvedValueOnce({ data: mockData })

    const payload = { email: 'mei@example.com', password: 'Password123!' }
    const result = await authService.login(payload)

    expect(api.post).toHaveBeenCalledWith('/auth/login', payload)
    expect(result).toEqual(mockData)
  })

  it('should call refresh endpoint with refresh token', async () => {
    const mockData = { accessToken: 'new-token-123' }
    api.post.mockResolvedValueOnce({ data: mockData })

    const result = await authService.refresh('ref-123')

    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'ref-123' })
    expect(result).toEqual(mockData)
  })
})
