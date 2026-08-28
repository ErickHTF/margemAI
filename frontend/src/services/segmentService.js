import api from './api'

export const getSegments = async () => {
  const response = await api.get('/segments')
  return response.data
}

export default {
  getSegments
}
