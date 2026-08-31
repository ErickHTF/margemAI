import { useState, useCallback } from 'react'
import authService from '../services/authService'
import { getAccessToken, setTokens, clearTokens } from '../utils/tokenStorage'

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

  return {
    user,
    login,
    logout,
    isAuthenticated: Boolean(getAccessToken())
  }
}
