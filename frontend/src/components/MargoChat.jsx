import { useContext, useEffect, useRef, useState } from 'react'
import { Calculator, Loader2, SendHorizontal, Stethoscope, Telescope, User } from 'lucide-react'
import { Badge, Button, Card, Notice, Textarea } from './ui'
import AssistantCards from './AssistantCards'
import MargoAvatar from './MargoAvatar'
import { AssistantContext } from './AssistantContext'
import { ASSISTANT_NAME, QUICK_ACTIONS } from '../constants/assistant'
import { parseReply } from '../utils/assistantChat'
import { getSuggestions } from '../utils/assistantCards'

const QUICK_ICONS = { diagnosis: Stethoscope, projection: Telescope }

const Segments = ({ segments }) =>
  segments.map((segment, index) =>
    segment.bold
      ? <strong key={index} className="font-semibold text-slate-900">{segment.text}</strong>
      : <span key={index}>{segment.text}</span>
  )

const ReplyText = ({ text }) => (
  <div className="space-y-3 text-sm leading-relaxed text-slate-700">
    {parseReply(text).map((block, index) => {
      if (block.type === 'heading') {
        return <p key={index} className="font-bold text-slate-900"><Segments segments={block.segments} /></p>
      }
      if (block.type === 'list') {
        const List = block.ordered ? 'ol' : 'ul'
        return (
          <List key={index} className={`space-y-1.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
            {block.items.map((item, itemIndex) => <li key={itemIndex}><Segments segments={item} /></li>)}
          </List>
        )
      }
      return (
        <p key={index}>
          {block.lines.map((line, lineIndex) => <span key={lineIndex} className="block"><Segments segments={line} /></span>)}
        </p>
      )
    })}
  </div>
)

const MargoMessage = ({ message }) => (
  <div className="flex items-start gap-2.5">
    <MargoAvatar className="mt-1" />
    <div className="min-w-0 flex-1 space-y-3">
      <Card tone={message.error ? 'rose' : 'white'} padding="sm" className="space-y-3">
        <ReplyText text={message.content} />
        {message.toolsUsed?.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">Calculado com:</span>
            {message.toolsUsed.map((tool) => <Badge key={tool} tone="sky" Icon={Calculator}>{tool}</Badge>)}
          </div>
        )}
      </Card>
      <AssistantCards cards={message.cards} />
    </div>
  </div>
)

const UserMessage = ({ message }) => (
  <div className="flex items-start justify-end gap-2.5">
    <Card tone="indigo" padding="sm" className="max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap">
      {message.content}
    </Card>
    <span className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 sm:flex">
      <User className="h-4 w-4" />
    </span>
  </div>
)

export default function MargoChat({ screen, compact = false }) {
  const { status, loadingStatus, statusError, messages, sending, send } = useContext(AssistantContext)
  const [draft, setDraft] = useState('')
  const endRef = useRef(null)

  const enabled = Boolean(status?.enabled)
  const remaining = status?.remainingToday ?? 0
  const blocked = !enabled || remaining <= 0

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const submit = (text) => {
    if (blocked || sending || !text.trim()) return
    send(text, screen)
    setDraft('')
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit(draft)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {statusError && <Notice tone="rose">{statusError}</Notice>}
      {!loadingStatus && status && !enabled && (
        <Notice tone="amber" title={`${ASSISTANT_NAME} desativada`}>
          A inteligência artificial ainda não foi ativada neste ambiente. As demais telas funcionam normalmente.
        </Notice>
      )}
      {enabled && remaining <= 0 && (
        <Notice tone="amber">Você usou todas as perguntas de hoje. A {ASSISTANT_NAME} volta amanhã.</Notice>
      )}

      <div data-tour="assistant-conversation" className={`space-y-4 ${compact ? 'min-h-0 flex-1 overflow-y-auto pr-1' : ''}`}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <MargoAvatar className="mt-1" />
              <Card padding="sm" className="text-sm leading-relaxed text-slate-700">
                Oi! Eu sou a <strong className="text-slate-900">{ASSISTANT_NAME}</strong>, sua consultora financeira com IA.
                Analiso seus produtos, custos, taxas e vendas e mostro, com os seus números, o que dá para melhorar.
              </Card>
            </div>
            <div data-tour="assistant-suggestions" className="space-y-2">
              <div className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
                {QUICK_ACTIONS.map((action) => (
                  <Button
                    key={action.key}
                    variant="primary"
                    Icon={QUICK_ICONS[action.key]}
                    fullWidth
                    disabled={blocked || sending}
                    onClick={() => submit(action.prompt)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
              <div className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
                {getSuggestions(screen).map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="soft"
                    fullWidth
                    disabled={blocked || sending}
                    onClick={() => submit(suggestion)}
                    className="justify-start text-left"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => message.role === 'user'
            ? <UserMessage key={message.id} message={message} />
            : <MargoMessage key={message.id} message={message} />)
        )}
        {sending && (
          <div role="status" className="flex items-center gap-2 pl-11 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            A {ASSISTANT_NAME} está analisando seus dados...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <Card data-tour="assistant-composer" padding="sm" className="space-y-2">
        <label htmlFor={compact ? 'margo-question-panel' : 'margo-question'} className="sr-only">Sua pergunta para a {ASSISTANT_NAME}</label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Textarea
            id={compact ? 'margo-question-panel' : 'margo-question'}
            rows={2}
            maxLength={4000}
            placeholder="Pergunte do seu jeito. Ex.: o desconto de 10% no Açaí ainda dá lucro?"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={blocked || sending}
            className="flex-1"
          />
          <Button
            Icon={SendHorizontal}
            onClick={() => submit(draft)}
            loading={sending}
            disabled={blocked || !draft.trim()}
            className="w-full sm:w-auto"
          >
            Perguntar
          </Button>
        </div>
        <p className="text-[11px] text-slate-500">
          {enabled ? `${remaining} ${remaining === 1 ? 'pergunta restante' : 'perguntas restantes'} hoje · ` : ''}
          Respostas geradas por IA com os seus dados; os números dos cartões vêm direto dos cálculos.
        </p>
      </Card>
    </div>
  )
}
