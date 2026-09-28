import { useState, useCallback, useEffect } from 'react'
import saleService from '../services/saleService'

export function useSales(initialFilters = {}) {
  const [salesData, setSalesData] = useState({
    totalGrossRevenue: 0,
    totalFeeAmount: 0,
    totalNetRevenue: 0,
    totalSalesCount: 0,
    sales: { content: [], totalElements: 0, totalPages: 0 }
  })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(initialFilters)

  const fetchSales = useCallback(async (currentFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await saleService.getSales(currentFilters)
      setSalesData(data)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao carregar histórico de vendas.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchSales(filters)
  }, [fetchSales, filters])

  const recordSale = async (salePayload) => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await saleService.createSale(salePayload)
      // Recarregar os dados para atualizar os totais e a listagem de forma íntegra
      await fetchSales(filters)
      return created
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.details?.[0] || 'Erro ao registrar venda.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const removeSale = async (saleId) => {
    try {
      await saleService.deleteSale(saleId)
      await fetchSales(filters)
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao excluir venda.'
      setError(msg)
      throw new Error(msg)
    }
  }

  return {
    salesData,
    loading,
    submitting,
    error,
    filters,
    setFilters,
    fetchSales,
    recordSale,
    removeSale
  }
}

export default useSales
