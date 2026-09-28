import api from './api'

export const saleService = {
  async getSales(params = {}) {
    const response = await api.get('/sales', { params })
    return response.data
  },

  async getSale(id) {
    const response = await api.get(`/sales/${id}`)
    return response.data
  },

  async createSale(data) {
    const response = await api.post('/sales', data)
    return response.data
  },

  async deleteSale(id) {
    await api.delete(`/sales/${id}`)
  }
}

export default saleService
