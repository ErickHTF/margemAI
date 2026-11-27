import api from './api'

export const obligationService = {
  async getSchedule(params = {}) {
    const response = await api.get('/obligations', { params })
    return response.data
  },

  async updateStatus(id, payload) {
    const response = await api.patch(`/obligations/${id}/status`, payload)
    return response.data
  },

  async updateReminders(payload) {
    const response = await api.patch('/obligations/reminders', payload)
    return response.data
  }
}

export default obligationService
