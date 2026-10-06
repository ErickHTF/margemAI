import api from './api'

export const alertService = {
  async getMeiCapStatus(params = {}) {
    const response = await api.get('/alerts/mei-cap', { params })
    return response.data
  }
}

export default alertService
