import { useEffect, useState, useCallback } from 'react'
import { accountService } from '../services/accountService'
export default function useBusinessAccounts(accountId) {
  const [accounts, setAccounts] = useState([])
  const [movements, setMovements] = useState([])
  const [loadedKey, setLoadedKey] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision(v => v + 1), [])
  useEffect(() => {
    let cancelled = false
    Promise.all([accountService.list(), accountService.history(accountId)])
      .then(([a, m]) => { if (!cancelled) { setAccounts(a); setMovements(m); setError('') } })
      .catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Não foi possível carregar as contas.') })
      .finally(() => { if (!cancelled) setLoadedKey(`${accountId}:${revision}`) })
    return () => { cancelled = true }
  }, [accountId, revision])
  return { accounts, movements, loading: loadedKey !== `${accountId}:${revision}`, error, reload }
}
