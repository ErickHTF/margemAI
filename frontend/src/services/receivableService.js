import api from './api'

export const receivableService = {
  async list(params = {}) {
    const response = await api.get('/receivables', { params })
    return response.data
  },

  async get(id) {
    const response = await api.get(`/receivables/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/receivables', data)
    return response.data
  },

  async delete(id) {
    await api.delete(`/receivables/${id}`)
  },

  async settleInstallment(id, data = {}) {
    const response = await api.post(`/receivables/installments/${id}/settle`, data)
    return response.data
  },

  async reverseInstallment(id, data = {}) {
    const response = await api.post(`/receivables/installments/${id}/reverse`, data)
    return response.data
  }
}

export default receivableService
