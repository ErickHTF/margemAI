import api from './api'

export const dashboardService = {
  async getMonthlyFlow(params = {}) {
    const response = await api.get('/dashboard/monthly-flow', { params })
    return response.data
  }
}

export default dashboardService
