import { useContext, useEffect, useState } from 'react'
import { Maximize2, MessageSquarePlus, Sparkles, X } from 'lucide-react'
import MargoChat from './MargoChat'
import MargoAvatar from './MargoAvatar'
import { Badge, IconButton } from './ui'
import { AssistantContext } from './AssistantContext'
import { ASSISTANT_NAME } from '../constants/assistant'

export default function AssistantBubble({ screen, onOpenFull }) {
  const { messages, sending, reset } = useContext(AssistantContext)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (screen === 'assistant') return null

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={`Conversa com a ${ASSISTANT_NAME}`}
          className="fixed inset-0 z-40 flex flex-col bg-slate-50 sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100vh-8rem))] sm:w-[420px] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:rounded-t-2xl">
            <MargoAvatar size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-bold text-slate-900">
                {ASSISTANT_NAME}
                <Badge tone="indigo">IA</Badge>
              </p>
              <p className="truncate text-[11px] text-slate-500">Consultora financeira do seu negócio</p>
            </div>
            {messages.length > 0 && (
              <IconButton label="Nova conversa" Icon={MessageSquarePlus} onClick={reset} disabled={sending} />
            )}
            <IconButton label="Abrir em tela cheia" Icon={Maximize2} onClick={() => { setOpen(false); onOpenFull() }} />
            <IconButton label="Fechar" Icon={X} onClick={() => setOpen(false)} />
          </header>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <MargoChat screen={screen} compact />
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? `Fechar a ${ASSISTANT_NAME}` : `Perguntar à ${ASSISTANT_NAME}`}
        className={`fixed bottom-5 right-5 z-40 items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 py-2 pl-2 pr-4 font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:brightness-110 sm:bottom-6 sm:right-6 ${open ? 'hidden sm:flex' : 'flex'}`}
      >
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-sm">{open ? 'Fechar' : `Pergunte à ${ASSISTANT_NAME}`}</span>
      </button>
    </>
  )
}
