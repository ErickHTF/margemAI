import useAssistant from '../hooks/useAssistant'
import { AssistantContext } from './AssistantContext'

export default function AssistantProvider({ children }) {
  const assistant = useAssistant()
  return <AssistantContext.Provider value={assistant}>{children}</AssistantContext.Provider>
}
