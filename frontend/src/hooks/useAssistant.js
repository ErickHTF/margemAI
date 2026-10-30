import { useRef, useState } from 'react'
import assistantService from '../services/assistantService'
import { getApiErrorMessage } from '../services/apiError'
import { toApiHistory } from '../utils/assistantChat'
import useApiResource from './useApiResource'

export function useAssistant() {
  const { data: status, loading: loadingStatus, error: statusError, setData: setStatus } = useApiResource(
    () => assistantService.getStatus(), [],
    { errorMessage: 'Não foi possível verificar a Margô.' }
  )
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const nextId = useRef(1)

  const send = async (text, screen) => {
    const content = text.trim()
    if (!content || sending) return
    const question = { id: nextId.current++, role: 'user', content }
    const history = toApiHistory([...messages, question])
    setMessages((current) => [...current, question])
    setSending(true)
    try {
      const reply = await assistantService.sendMessage(history, screen)
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: 'assistant',
        content: reply.reply,
        toolsUsed: reply.toolsUsed || [],
        cards: reply.cards || []
      }])
      setStatus((current) => (current ? { ...current, remainingToday: reply.remainingToday } : current))
    } catch (err) {
      setMessages((current) => [...current, {
        id: nextId.current++,
        role: 'assistant',
        content: getApiErrorMessage(err, 'Não foi possível falar com a Margô agora.'),
        error: true
      }])
    } finally {
      setSending(false)
    }
  }

  const reset = () => setMessages([])

  return { status, loadingStatus, statusError, messages, sending, send, reset }
}

export default useAssistant
