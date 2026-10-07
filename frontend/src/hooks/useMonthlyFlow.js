import { useState, useEffect } from 'react'
import dashboardService from '../services/dashboardService'

export function useMonthlyFlow(initialMonths = 6) {
  const [flowData, setFlowData] = useState(null)
  const [months, setMonths] = useState(initialMonths)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await dashboardService.getMonthlyFlow({ months })
        if (!cancelled) {
          setFlowData(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'Erro ao carregar o histórico do fluxo de caixa.'
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
  }, [months])

  const changeMonths = (value) => {
    if (value === months) return
    setLoading(true)
    setMonths(value)
  }

  return {
    flowData,
    months,
    changeMonths,
    loading,
    error
  }
}

export default useMonthlyFlow
