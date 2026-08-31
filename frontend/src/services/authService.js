import api from './api'

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  async login(data) {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  async refresh(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  }
}

export default authService
