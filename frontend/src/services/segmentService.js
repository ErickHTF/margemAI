import api from './api'

export const getSegments = async () => {
  const response = await api.get('/segments')
  return response.data
}

export const getSegmentGuidance = async (params = {}) => {
  const response = await api.get('/segments/guidance', { params })
  return response.data
}

export default {
  getSegments,
  getSegmentGuidance
}
