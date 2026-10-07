import { useState, useEffect, useCallback } from 'react'
import paymentMethodService from '../services/paymentMethodService'
import { resolvePaymentFee } from '../utils/paymentFees'

// Padrão do projeto: toda tela que exibe ou calcula taxa de pagamento usa este hook,
// nunca valores fixos. Se a matriz falhar ao carregar, getFee cai nos padrões recomendados.
export function usePaymentFees() {
  const [matrix, setMatrix] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await paymentMethodService.getPaymentMethodConfigs()
        if (!cancelled) {
          setMatrix(data || [])
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err.response?.data?.message ||
            'Não foi possível carregar suas taxas configuradas. Usando as taxas recomendadas.'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const getFee = useCallback(
    (paymentMethod, installments = 1) => resolvePaymentFee(matrix, paymentMethod, installments),
    [matrix]
  )

  return { matrix, getFee, loading, error }
}

export default usePaymentFees
