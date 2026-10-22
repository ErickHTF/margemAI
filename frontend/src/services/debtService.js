import api from './api'

export const debtService = {
  async list() {
    return (await api.get('/debts')).data
  },
  async get(id) {
    return (await api.get(`/debts/${id}`)).data
  },
  async getSummary() {
    return (await api.get('/debts/summary')).data
  },
  async getSchedule(params = {}) {
    return (await api.get('/debts/schedule', { params })).data
  },
  async create(data) {
    return (await api.post('/debts', data)).data
  },
  async update(id, data) {
    return (await api.put(`/debts/${id}`, data)).data
  },
  async remove(id) {
    await api.delete(`/debts/${id}`)
  },
  async simulatePayoff(id, data = {}) {
    return (await api.post(`/debts/${id}/simulate-payoff`, data)).data
  },
  async payInstallment(installmentId, data = {}) {
    return (await api.post(`/debts/installments/${installmentId}/pay`, data)).data
  }
}

export default debtService
