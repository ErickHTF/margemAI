import api from './api'

export const profileService = {
  async get() {
    const response = await api.get('/profile')
    return response.data
  },

  async update(data) {
    const response = await api.put('/profile', data)
    return response.data
  },

  async patch(data) {
    const response = await api.patch('/profile', data)
    return response.data
  }
}

export default profileService
