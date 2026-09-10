import { useState, useCallback, useEffect } from 'react'
import { authService, getAccessToken, setTokens, clearTokens } from '../security'
import profileService from '../services/profileService'

export default function useAuth() {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(Boolean(getAccessToken()))

  useEffect(() => {
    let cancelled = false

    const restoreSession = async () => {
      if (!getAccessToken()) {
        setInitializing(false)
        return
      }
      try {
        const profile = await profileService.get()
        if (!cancelled) setUser(profile)
      } catch {
        if (!cancelled) clearTokens()
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }

    restoreSession()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (credentials) => {
    const data = await authService.login(credentials)
    setTokens(data.accessToken, data.refreshToken)
    setUser(data.user)
    return data
  }

  const logout = useCallback(() => {
    clearTokens()
    setUser(null)
  }, [])

  const updateUser = useCallback((nextUser) => {
    setUser((prev) => ({ ...prev, ...nextUser }))
  }, [])

  return {
    user,
    login,
    logout,
    updateUser,
    initializing,
    isAuthenticated: Boolean(user)
  }
}
