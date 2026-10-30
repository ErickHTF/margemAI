import { useContext } from 'react'
import { BotMessageSquare, MessageSquarePlus } from 'lucide-react'
import PageHeader from './PageHeader'
import MargoChat from './MargoChat'
import { Badge, Button } from './ui'
import { AssistantContext } from './AssistantContext'
import { ASSISTANT_NAME } from '../constants/assistant'

export default function AssistantChat() {
  const { messages, sending, reset } = useContext(AssistantContext)
  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={BotMessageSquare}
        title={ASSISTANT_NAME}
        description="Sua consultora financeira com inteligência artificial: analisa preços, margens, taxas, caixa e o futuro do seu negócio."
        tip={<Badge tone="indigo">IA</Badge>}
      >
        {messages.length > 0 && (
          <Button variant="secondary" Icon={MessageSquarePlus} onClick={reset} disabled={sending}>
            Nova conversa
          </Button>
        )}
      </PageHeader>
      <MargoChat screen="assistant" />
    </div>
  )
}
