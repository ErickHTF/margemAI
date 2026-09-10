import api from './api'

export const productService = {
  async getProducts(params = {}) {
    const response = await api.get('/products', { params })
    return response.data
  },

  async getProduct(id) {
    const response = await api.get(`/products/${id}`)
    return response.data
  },

  async createProduct(data) {
    const response = await api.post('/products', data)
    return response.data
  },

  async updateProduct(id, data) {
    const response = await api.put(`/products/${id}`, data)
    return response.data
  },

  async patchProduct(id, data) {
    const response = await api.patch(`/products/${id}`, data)
    return response.data
  },

  async deleteProduct(id) {
    await api.delete(`/products/${id}`)
  }
}

export default productService
