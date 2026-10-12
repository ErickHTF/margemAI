import alertService from '../services/alertService'
import { useApiResource } from './useApiResource'

// Status do teto anual de faturamento MEI (faturamento acumulado no ano x limite do perfil).
// Mude reloadKey para recarregar (ex.: depois de editar o teto no perfil).
export function useMeiCap(reloadKey = 0) {
  const { data: meiCap, loading, error } = useApiResource(() => alertService.getMeiCapStatus(), [reloadKey], {
    errorMessage: 'Não foi possível carregar o alerta do teto MEI.'
  })
  return { meiCap, loading, error }
}

export default useMeiCap
