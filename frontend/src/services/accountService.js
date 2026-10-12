import api from './api'
export const accountService = {
  async list() { return (await api.get('/accounts')).data },
  async history(accountId) { return (await api.get('/accounts/movements', { params: { accountId: accountId || undefined } })).data },
  async create(data) { return (await api.post('/accounts', data)).data },
  async movement(data) { return (await api.post('/accounts/movements', data)).data }
}
