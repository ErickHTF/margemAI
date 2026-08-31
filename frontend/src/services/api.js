import axios from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../utils/tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthRequest =
      originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest &&
      getRefreshToken()
    ) {
      originalRequest._retry = true
      try {
        refreshPromise = refreshPromise || api.post('/auth/refresh', { refreshToken: getRefreshToken() })
        const { data } = await refreshPromise
        refreshPromise = null
        setTokens(data.accessToken, data.refreshToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        refreshPromise = null
        clearTokens()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api
