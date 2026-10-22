import api from './api'

export const payableService = {
  async list(params) {
    const response = await api.get('/payables', { params })
    return response.data
  },

  async get(id) {
    const response = await api.get(`/payables/${id}`)
    return response.data
  },

  async create(data) {
    const response = await api.post('/payables', data)
    return response.data
  },

  async update(id, data) {
    const response = await api.put(`/payables/${id}`, data)
    return response.data
  },

  async remove(id) {
    const response = await api.delete(`/payables/${id}`)
    return response.data
  },

  async pay(id, data) {
    const response = await api.post(`/payables/${id}/pay`, data)
    return response.data
  },

  async reverse(id) {
    const response = await api.post(`/payables/${id}/reverse`)
    return response.data
  },

  async generateRecurring(data) {
    const response = await api.post('/payables/generate-recurring', data)
    return response.data
  }
}

export default payableService
