import api from './api'

export const variableCostService = {
  async list(params) {
    const response = await api.get('/costs/variable', { params })
    return response.data
  },

  async get(id) {
    const response = await api.get(`/costs/variable/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/costs/variable', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/costs/variable/${id}`, data)
    return response.data
  },

  async patch(id, data) {
    const response = await api.patch(`/costs/variable/${id}`, data)
    return response.data
  },

  async remove(id) {
    const response = await api.delete(`/costs/variable/${id}`)
    return response.data
  }
}

export default variableCostService
