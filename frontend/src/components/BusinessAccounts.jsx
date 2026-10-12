import { useEffect, useState } from 'react'
import { Landmark } from 'lucide-react'
import PageHeader from './PageHeader'
import TipButton from './TipButton'
import { SEBRAE_PILLS } from '../data/sebraePills'
import useBusinessAccounts from '../hooks/useBusinessAccounts'
import { accountService } from '../services/accountService'
import { formatCurrencyBRL, formatDateBR } from '../utils/formatters'

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const emptyAccount = () => ({ name: '', openingBalance: '0', openingDate: today() })
const emptyMovement = () => ({ accountId: '', destinationId: '', type: 'APORTE', amount: '', date: today(), description: '' })
const labels = { APORTE: 'Aporte', RETIRADA: 'Retirada', PRO_LABORE: 'Pró-labore', TRANSFERENCIA: 'Transferência' }
const fieldClass = 'mt-1 w-full rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const buttonClass = 'rounded-lg bg-indigo-600 text-white px-4 py-2 disabled:opacity-50'

export default function BusinessAccounts({ onDirtyChange }) {
  const [filter, setFilter] = useState('')
  const { accounts, movements, loading, error, reload } = useBusinessAccounts(filter)
  const [account, setAccount] = useState(emptyAccount)
  const [movement, setMovement] = useState(emptyMovement)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failure, setFailure] = useState('')
  const accountChanges = Number(account.name !== '') + Number(account.openingBalance !== '0') + Number(account.openingDate !== today())
  const movementChanges = Object.keys(movement).filter(k => movement[k] !== emptyMovement()[k]).length
  const dirty = accountChanges + movementChanges > 0
  useEffect(() => {
    onDirtyChange?.(dirty)
    const prevent = e => { e.preventDefault(); e.returnValue = '' }
    if (dirty) window.addEventListener('beforeunload', prevent)
    return () => { window.removeEventListener('beforeunload', prevent); onDirtyChange?.(false) }
  }, [dirty, onDirtyChange])
  const submit = async (event, kind) => {
    event.preventDefault()
    setBusy(true); setFailure(''); setFeedback('')
    try {
      if (kind === 'account') {
        await accountService.create(account)
        setAccount(emptyAccount())
      } else {
        await accountService.movement({ ...movement, destinationId: movement.type === 'TRANSFERENCIA' ? movement.destinationId : null })
        setMovement(emptyMovement())
      }
      setFeedback(kind === 'account' ? 'Conta criada.' : 'Movimento registrado.')
      reload()
    } catch (err) { setFailure(err.response?.data?.message || 'Não foi possível salvar. Tente novamente.') }
    finally { setBusy(false) }
  }
  const updateAccount = e => setAccount({ ...account, [e.target.name]: e.target.value })
  const updateMovement = e => setMovement({ ...movement, [e.target.name]: e.target.value, ...(e.target.name === 'type' ? { destinationId: '' } : {}) })
  const accountName = id => accounts.find(a => a.id === id)?.name || '—'
  return <div className="w-full space-y-6">
    <PageHeader Icon={Landmark} title="Contas Empresariais" description="Saldos e movimentos do dinheiro do negócio." tip={<TipButton pill={SEBRAE_PILLS.find(p => p.id === 'pro-labore')} />} />
    {(error || failure) && <p role="alert" className="text-rose-700">{failure || error}</p>}
    {feedback && <p role="status" className="text-emerald-700">{feedback}</p>}
    {dirty && <p className="text-amber-700">{accountChanges + movementChanges} alterações não salvas</p>}
    <label data-tour="accounts-filter" className="block sm:w-72 text-sm font-medium text-slate-600">Filtrar por conta<select className={fieldClass} value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todas as contas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    {loading ? <p role="status">Carregando contas...</p> : <div className="grid gap-4 sm:grid-cols-2">{accounts.filter(a => !filter || a.id === filter).map(a => <article key={a.id} className="bg-white border border-slate-200 rounded-xl p-4"><h2 className="font-semibold">{a.name}</h2><p className="text-2xl font-bold">{formatCurrencyBRL(a.balance)}</p><p className="text-sm text-slate-500">Saldo inicial: {formatCurrencyBRL(a.openingBalance)} em {formatDateBR(a.openingDate)}</p></article>)}{!accounts.length && <p>Comece cadastrando uma conta, como seu banco PJ ou caixa em dinheiro.</p>}</div>}
    <div className="grid gap-6 md:grid-cols-2">
      <form data-tour="accounts-new" onSubmit={e => submit(e, 'account')} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Nova conta {accountChanges > 0 && <span className="text-amber-700 text-sm">Não salvo</span>}</h2>
        <label className="block">Nome da conta<input placeholder="Ex.: Banco PJ ou Caixa em dinheiro" required maxLength={100} name="name" value={account.name} onChange={updateAccount} className={fieldClass} /></label>
        <label className="block">Saldo inicial (R$)<input required type="number" step="0.01" name="openingBalance" value={account.openingBalance} onChange={updateAccount} className={fieldClass} /></label>
        <label className="block">Data do saldo inicial<input required type="date" max={today()} name="openingDate" value={account.openingDate} onChange={updateAccount} className={fieldClass} /></label>
        <button disabled={busy || !accountChanges || !account.name.trim()} className={buttonClass}>Salvar conta</button>
      </form>
      <form data-tour="accounts-movement" onSubmit={e => submit(e, 'movement')} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold">Novo movimento {movementChanges > 0 && <span className="text-amber-700 text-sm">Não salvo</span>}</h2>
        <label className="block">Tipo<select name="type" value={movement.type} onChange={updateMovement} className={fieldClass}>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block">{movement.type === 'APORTE' ? 'Conta que recebe o aporte' : movement.type === 'TRANSFERENCIA' ? 'Conta de origem' : 'Conta de onde sai o dinheiro'}<select required name="accountId" value={movement.accountId} onChange={updateMovement} className={fieldClass}><option value="">Selecione</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        {movement.type === 'TRANSFERENCIA' && <label className="block">Conta de destino<select required name="destinationId" value={movement.destinationId} onChange={updateMovement} className={fieldClass}><option value="">Selecione</option>{accounts.filter(a => a.id !== movement.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
        <label className="block">Valor (R$)<input required type="number" min="0.01" step="0.01" name="amount" value={movement.amount} onChange={updateMovement} className={fieldClass} /></label>
        <label className="block">Data<input required type="date" max={today()} name="date" value={movement.date} onChange={updateMovement} className={fieldClass} /></label>
        <label className="block">Descrição<input required maxLength={200} name="description" value={movement.description} onChange={updateMovement} className={fieldClass} /></label>
        {movement.type === 'PRO_LABORE' && <p className="text-sky-700 text-sm">Reduz o saldo, sem criar outro custo. O pró-labore para precificação fica em Custos Fixos.</p>}
        <button disabled={busy || !movementChanges || !accounts.length} className={buttonClass}>Salvar movimento</button>
      </form>
    </div>
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"><h2 className="font-semibold">Movimentos</h2><p className="text-sm text-slate-500">Vendas e custos não atualizam estes saldos automaticamente.</p>{!loading && !movements.length && <p>Nenhum movimento registrado.</p>}{!loading && movements.map(m => <article key={m.id} className="border-t border-slate-100 py-3"><p className="font-medium">{labels[m.type]} · {formatCurrencyBRL(m.amount)}</p><p>{m.description}</p><p className="text-sm text-slate-500">{formatDateBR(m.date)} · {accountName(m.accountId)}{m.destinationId && ` → ${accountName(m.destinationId)}`}</p></article>)}</section>
  </div>
}
