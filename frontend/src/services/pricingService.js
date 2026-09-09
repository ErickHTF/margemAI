import api from './api'

export const calculatePricing = async (data) => {
  const response = await api.post('/pricing/calculate', data)
  return response.data
}

export const simulateDiscount = async (data) => {
  const response = await api.post('/pricing/simulate-discount', data)
  return response.data
}
