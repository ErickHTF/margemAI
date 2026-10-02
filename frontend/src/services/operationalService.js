import api from './api'

export const operationalService = {
  async getFixedCostsSummary() {
    const response = await api.get('/settings/operational/fixed-costs-summary')
    return response.data
  },

  async updateRateioConfig(data) {
    const response = await api.patch('/settings/operational/rateio-config', data)
    return response.data
  }
}

export default operationalService
