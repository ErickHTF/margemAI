import api from './api'

export const paymentMethodService = {
  async getPaymentMethodConfigs() {
    const response = await api.get('/settings/financial/payment-methods')
    return response.data
  },

  async updatePaymentMethodConfigs(configs) {
    const response = await api.put('/settings/financial/payment-methods', configs)
    return response.data
  }
}

export default paymentMethodService
