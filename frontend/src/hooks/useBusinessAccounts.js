import { accountService } from '../services/accountService'
import { useApiResource } from './useApiResource'

const EMPTY = { accounts: [], movements: [] }

export default function useBusinessAccounts(accountId) {
  const { data, loading, error, reload } = useApiResource(
    async () => {
      const [accounts, movements] = await Promise.all([accountService.list(), accountService.history(accountId)])
      return { accounts, movements }
    },
    [accountId],
    { initialData: EMPTY, errorMessage: 'Não foi possível carregar as contas.' }
  )
  return { accounts: data.accounts, movements: data.movements, loading, error: error || '', reload }
}
