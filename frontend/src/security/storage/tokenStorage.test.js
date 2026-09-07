import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage'

describe('tokenStorage', () => {
  let store = {}

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => {
        store[key] = String(val)
      },
      removeItem: (key) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      }
    })
  })

  it('should store and retrieve access and refresh tokens', () => {
    setTokens('token-abc', 'refresh-xyz')
    expect(getAccessToken()).toBe('token-abc')
    expect(getRefreshToken()).toBe('refresh-xyz')
  })

  it('should clear stored tokens', () => {
    setTokens('token-abc', 'refresh-xyz')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
