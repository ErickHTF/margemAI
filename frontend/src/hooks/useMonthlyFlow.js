import { useState } from 'react'
import dashboardService from '../services/dashboardService'
import { useApiResource } from './useApiResource'

export function useMonthlyFlow(initialMonths = 6) {
  const [months, setMonths] = useState(initialMonths)
  const { data: flowData, loading, error } = useApiResource(() => dashboardService.getMonthlyFlow({ months }), [months], {
    errorMessage: 'Erro ao carregar o histórico do fluxo de caixa.'
  })

  const changeMonths = (value) => setMonths(value)

  return {
    flowData,
    months,
    changeMonths,
    loading,
    error
  }
}

export default useMonthlyFlow
