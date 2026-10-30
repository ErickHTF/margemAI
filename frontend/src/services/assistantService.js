import api from './api'

export const assistantService = {
  async getStatus() {
    const response = await api.get('/assistant/status')
    return response.data
  },

  async sendMessage(messages, screen) {
    const response = await api.post('/assistant/messages', screen ? { messages, screen } : { messages })
    return response.data
  }
}

export default assistantService
