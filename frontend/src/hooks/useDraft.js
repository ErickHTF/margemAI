import { useCallback, useContext, useEffect, useId, useState } from 'react'
import { DraftContext } from '../components/DraftContext'

export default function useDraft(value, baseline) {
  const context = useContext(DraftContext)
  const id = useId()
  const [saved, setSaved] = useState(() => JSON.stringify(value))
  const snapshot = JSON.stringify(value)
  const reference = baseline === undefined ? saved : JSON.stringify(baseline)
  const dirty = snapshot !== reference
  const original = JSON.parse(reference)
  const changes = value && typeof value === 'object'
    ? [...new Set([...Object.keys(value), ...Object.keys(original || {})])].filter(key => JSON.stringify(value[key]) !== JSON.stringify(original?.[key])).length
    : Number(dirty)
  const register = context?.register
  useEffect(() => {
    register?.(id, dirty)
    return () => register?.(id, false)
  }, [id, dirty, register])
  const markSaved = useCallback(next => setSaved(JSON.stringify(next)), [])
  return { dirty, changes, markSaved, guard: context?.guard || (action => action?.()) }
}
