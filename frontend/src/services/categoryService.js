import api from './api'

export const categoryService = {
  async getCategories(params = {}) {
    const response = await api.get('/categories', { params })
    return response.data
  },

  async getCategory(id) {
    const response = await api.get(`/categories/${id}`)
    return response.data
  },

  async createCategory(data) {
    const response = await api.post('/categories', data)
    return response.data
  },

  async updateCategory(id, data) {
    const response = await api.put(`/categories/${id}`, data)
    return response.data
  },

  async patchCategoryStatus(id, active) {
    const response = await api.patch(`/categories/${id}/status`, { active })
    return response.data
  },

  async deleteCategory(id) {
    await api.delete(`/categories/${id}`)
  },

  async revalidatePrices(id) {
    const response = await api.post(`/categories/${id}/revalidate-prices`)
    return response.data
  }
}

export default categoryService
