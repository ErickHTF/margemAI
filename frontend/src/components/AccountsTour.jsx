import { useEffect, useRef, useState } from 'react'
import { Landmark, ArrowLeftRight, ListFilter, X } from 'lucide-react'

const steps = [
  { Icon: Landmark, title: 'Onde está o dinheiro?', text: 'Cadastre seu banco PJ, carteira digital ou caixa em espécie. Uma conta pode ser suficiente.', example: 'Banco PJ · Caixa em dinheiro' },
  { Icon: Landmark, title: 'Comece pelo saldo inicial', text: 'Informe quanto já havia na conta e em qual data. Os próximos movimentos serão somados ou descontados desse valor.', example: 'Saldo inicial R$ 100 + aporte R$ 30 = R$ 130' },
  { Icon: ArrowLeftRight, title: 'Registre entradas e saídas', text: 'Aporte é dinheiro seu entrando. Retirada é dinheiro saindo para uso pessoal. Pró-labore é o pagamento pelo seu trabalho e não cria outro custo.', example: 'O custo do pró-labore fica em Custos Fixos.' },
  { Icon: ArrowLeftRight, title: 'Mova dinheiro entre contas', text: 'Na transferência, uma conta diminui e a outra aumenta. O total da empresa continua igual.', example: 'R$ 100 do banco → R$ 100 no caixa' },
  { Icon: ListFilter, title: 'Acompanhe os movimentos', text: 'Use o filtro para ver uma conta ou todas. Vendas e custos ainda não atualizam estes saldos automaticamente.', example: 'Para rever estas dicas, clique em “Como usar”.' }
]

export default function AccountsTour({ onClose }) {
  const [step, setStep] = useState(0)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const { Icon, title, text, example } = steps[step]
  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKey = event => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
      previousFocus?.focus()
    }
  }, [onClose])
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="accounts-tour-title" aria-describedby="accounts-tour-text" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Guia rápido · {step + 1} de {steps.length}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar guia" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-5 inline-flex rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Icon className="h-7 w-7" /></div>
      <div aria-live="polite" aria-atomic="true">
        <h2 id="accounts-tour-title" className="mt-4 text-xl font-bold text-slate-900">{title}</h2>
        <p id="accounts-tour-text" className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">{example}</p>
      </div>
      <div className="mt-6 flex gap-1.5" aria-hidden="true">{steps.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />)}</div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => step ? setStep(step - 1) : onClose()} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">{step ? 'Voltar' : 'Pular guia'}</button>
        <button type="button" onClick={() => step === steps.length - 1 ? onClose() : setStep(step + 1)} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{step === steps.length - 1 ? 'Começar' : 'Próximo'}</button>
      </div>
    </div>
  </div>
}
