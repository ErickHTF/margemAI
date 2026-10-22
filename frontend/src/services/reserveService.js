import api from './api'

export const reserveService = {
  async getSummary() {
    return (await api.get('/reserves')).data
  },
  async updateGoal(data) {
    return (await api.put('/reserves/goal', data)).data
  },
  async createMovement(data) {
    return (await api.post('/reserves/movements', data)).data
  }
}

export default reserveService
