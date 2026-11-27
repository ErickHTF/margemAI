import { useCallback } from 'react'
import paymentMethodService from '../services/paymentMethodService'
import { resolvePaymentFee } from '../utils/paymentFees'
import { useApiResource } from './useApiResource'

const NO_CONFIGS = []

// Padrão do projeto: toda tela que exibe ou calcula taxa de pagamento usa este hook,
// nunca valores fixos. Se a matriz falhar ao carregar, getFee cai nos padrões recomendados.
export function usePaymentFees(refreshKey = 0) {
  const { data: matrix, loading, error } = useApiResource(
    async () => (await paymentMethodService.getPaymentMethodConfigs()) || NO_CONFIGS,
    [refreshKey],
    {
      initialData: NO_CONFIGS,
      errorMessage: 'Não foi possível carregar suas taxas configuradas. Usando as taxas recomendadas.'
    }
  )

  const getFee = useCallback(
    (paymentMethod, installments = 1) => resolvePaymentFee(matrix, paymentMethod, installments),
    [matrix]
  )

  return { matrix, getFee, loading, error }
}

export default usePaymentFees
