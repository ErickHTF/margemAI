import { useCallback, useEffect, useState } from 'react'
import { getApiErrorMessage } from '../services/apiError'

const sameKey = (a, b) => a !== null && a.length === b.length && a.every((value, i) => Object.is(value, b[i]))

export function useApiResource(fetcher, deps = [], { initialData = null, errorMessage = 'Não foi possível carregar os dados.' } = {}) {
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  const [revision, setRevision] = useState(0)
  const [loadedKey, setLoadedKey] = useState(null)

  const reload = useCallback(() => setRevision((r) => r + 1), [])

  useEffect(() => {
    let cancelled = false
    const requestKey = [...deps, revision]

    const load = async () => {
      try {
        const result = await fetcher()
        if (!cancelled) {
          setData(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, errorMessage))
      } finally {
        if (!cancelled) setLoadedKey(requestKey)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // O fetcher é recriado a cada render; quem chama declara do que ele depende em `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision])

  const loading = !sameKey(loadedKey, [...deps, revision])

  return { data, loading, error, reload, setData }
}

export default useApiResource
