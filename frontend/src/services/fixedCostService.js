import api from './api'

export const fixedCostService = {
  async list(params) {
    const response = await api.get('/costs/fixed', { params })
    return response.data
  },

  async get(id) {
    const response = await api.get(`/costs/fixed/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/costs/fixed', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/costs/fixed/${id}`, data)
    return response.data
  },

  async patch(id, data) {
    const response = await api.patch(`/costs/fixed/${id}`, data)
    return response.data
  },

  async remove(id) {
    const response = await api.delete(`/costs/fixed/${id}`)
    return response.data
  }
}

export default fixedCostService
