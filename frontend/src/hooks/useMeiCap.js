import { useState, useEffect } from 'react'
import alertService from '../services/alertService'

// Status do teto anual de faturamento MEI (faturamento acumulado no ano x limite do perfil).
// Mude reloadKey para recarregar (ex.: depois de editar o teto no perfil).
export function useMeiCap(reloadKey = 0) {
  const [meiCap, setMeiCap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await alertService.getMeiCapStatus()
        if (!cancelled) {
          setMeiCap(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err.response?.data?.message || 'Não foi possível carregar o alerta do teto MEI.'
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
  }, [reloadKey])

  return { meiCap, loading, error }
}

export default useMeiCap
