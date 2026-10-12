import { useState } from 'react'
import saleService from '../services/saleService'
import { getApiErrorMessage } from '../services/apiError'
import { useApiResource } from './useApiResource'

const EMPTY_SALES = {
  totalGrossRevenue: 0,
  totalFeeAmount: 0,
  totalNetRevenue: 0,
  totalSalesCount: 0,
  sales: { content: [], totalElements: 0, totalPages: 0 }
}

export function useSales(initialFilters = {}) {
  const [submitting, setSubmitting] = useState(false)
  const [operationError, setOperationError] = useState(null)
  const [filters, setFilters] = useState(initialFilters)
  const { data: salesData, loading, error, reload } = useApiResource(() => saleService.getSales(filters), [filters], {
    initialData: EMPTY_SALES,
    errorMessage: 'Erro ao carregar histórico de vendas.'
  })

  const recordSale = async (salePayload) => {
    setSubmitting(true)
    setOperationError(null)
    try {
      const created = await saleService.createSale(salePayload)
      reload()
      return created
    } catch (err) {
      const msg = getApiErrorMessage(err, err.response?.data?.details?.[0] || 'Erro ao registrar venda.')
      throw new Error(msg, { cause: err })
    } finally {
      setSubmitting(false)
    }
  }

  const removeSale = async (saleId) => {
    setOperationError(null)
    try {
      await saleService.deleteSale(saleId)
      reload()
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Erro ao excluir venda.')
      setOperationError(msg)
      throw new Error(msg, { cause: err })
    }
  }

  return {
    salesData,
    loading,
    submitting,
    error,
    operationError,
    filters,
    setFilters,
    reload,
    recordSale,
    removeSale
  }
}

export default useSales
