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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await saleService.getSales(filters)
        if (!cancelled) {
          setSalesData(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'Erro ao carregar histórico de vendas.'
          setError(msg)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [filters, reloadKey])

  const recordSale = async (salePayload) => {
    setSubmitting(true)
    setError(null)
    try {
      const created = await saleService.createSale(salePayload)
      reload()
      return created
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.details?.[0] || 'Erro ao registrar venda.'
      setError(msg)
      throw new Error(msg, { cause: err })
    } finally {
      setSubmitting(false)
    }
  }

  const removeSale = async (saleId) => {
    try {
      await saleService.deleteSale(saleId)
      reload()
    } catch (err) {
      const msg = err.response?.data?.message || 'Erro ao excluir venda.'
      setError(msg)
      throw new Error(msg, { cause: err })
    }
  }

  return {
    salesData,
    loading,
    submitting,
    error,
    filters,
    setFilters,
    reload,
    recordSale,
    removeSale
  }
}

export default useSales
