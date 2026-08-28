import api from './api'

export const authService = {
  async register(data) {
    const response = await api.post('/auth/register', data)
    return response.data
  }
}

export default authService
