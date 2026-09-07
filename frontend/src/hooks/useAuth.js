import { useState, useCallback } from 'react'
import { authService, getAccessToken, setTokens, clearTokens } from '../security'

export default function useAuth() {
  const [user, setUser] = useState(null)

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
    isAuthenticated: Boolean(getAccessToken())
  }
}
