import { useState } from 'react'
import { Landmark } from 'lucide-react'
import PageHeader from './PageHeader'
import TipButton from './TipButton'
import { Badge, Button, Card, EmptyState, Field, Input, Notice, Select } from './ui'
import { SEBRAE_PILLS } from '../data/sebraePills'
import useBusinessAccounts from '../hooks/useBusinessAccounts'
import useDraft from '../hooks/useDraft'
import { accountService } from '../services/accountService'
import { formatCurrencyBRL, formatDateBR } from '../utils/formatters'

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const emptyAccount = () => ({ name: '', openingBalance: '0', openingDate: today() })
const emptyMovement = () => ({ accountId: '', destinationId: '', type: 'APORTE', amount: '', date: today(), description: '' })
const labels = { APORTE: 'Aporte', RETIRADA: 'Retirada', PRO_LABORE: 'Pró-labore', TRANSFERENCIA: 'Transferência' }

export default function BusinessAccounts() {
  const [filter, setFilter] = useState('')
  const { accounts, movements, loading, error, reload } = useBusinessAccounts(filter)
  const [account, setAccount] = useState(emptyAccount)
  const [movement, setMovement] = useState(emptyMovement)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failure, setFailure] = useState('')
  const accountChanges = Number(account.name !== '') + Number(account.openingBalance !== '0') + Number(account.openingDate !== today())
  const movementChanges = Object.keys(movement).filter(k => movement[k] !== emptyMovement()[k]).length
  const { dirty } = useDraft({ account, movement }, { account: emptyAccount(), movement: emptyMovement() })
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
    {(error || failure) && <Notice tone="rose">{failure || error}</Notice>}
    {feedback && <Notice tone="emerald">{feedback}</Notice>}
    {dirty && <p className="text-sm text-amber-700">{accountChanges + movementChanges} alterações não salvas</p>}
    <Field label="Filtrar por conta" className="sm:w-72" data-tour="accounts-filter">
      <Select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todas as contas</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
    </Field>
    {loading ? <EmptyState loading title="Carregando contas..." /> : <div className="grid gap-4 sm:grid-cols-2">{accounts.filter(a => !filter || a.id === filter).map(a => <Card as="article" key={a.id} padding="sm"><h2 className="font-semibold">{a.name}</h2><p className="text-2xl font-bold">{formatCurrencyBRL(a.balance)}</p><p className="text-sm text-slate-500">Saldo inicial: {formatCurrencyBRL(a.openingBalance)} em {formatDateBR(a.openingDate)}</p></Card>)}{!accounts.length && <p>Comece cadastrando uma conta, como seu banco PJ ou caixa em dinheiro.</p>}</div>}
    <div className="grid gap-6 md:grid-cols-2">
      <Card as="form" data-tour="accounts-new" onSubmit={e => submit(e, 'account')} className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">Nova conta {accountChanges > 0 && <Badge tone="amber">Não salvo</Badge>}</h2>
        <Field label="Nome da conta"><Input placeholder="Ex.: Banco PJ ou Caixa em dinheiro" required maxLength={100} name="name" value={account.name} onChange={updateAccount} /></Field>
        <Field label="Saldo inicial (R$)"><Input required type="number" step="0.01" name="openingBalance" value={account.openingBalance} onChange={updateAccount} /></Field>
        <Field label="Data do saldo inicial"><Input required type="date" max={today()} name="openingDate" value={account.openingDate} onChange={updateAccount} /></Field>
        <Button type="submit" className="w-full sm:w-auto" disabled={busy || !accountChanges || !account.name.trim()}>Salvar conta</Button>
      </Card>
      <Card as="form" data-tour="accounts-movement" onSubmit={e => submit(e, 'movement')} className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">Novo movimento {movementChanges > 0 && <Badge tone="amber">Não salvo</Badge>}</h2>
        <Field label="Tipo"><Select name="type" value={movement.type} onChange={updateMovement}>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label={movement.type === 'APORTE' ? 'Conta que recebe o aporte' : movement.type === 'TRANSFERENCIA' ? 'Conta de origem' : 'Conta de onde sai o dinheiro'}><Select required name="accountId" value={movement.accountId} onChange={updateMovement}><option value="">Selecione</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        {movement.type === 'TRANSFERENCIA' && <Field label="Conta de destino"><Select required name="destinationId" value={movement.destinationId} onChange={updateMovement}><option value="">Selecione</option>{accounts.filter(a => a.id !== movement.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>}
        <Field label="Valor (R$)"><Input required type="number" min="0.01" step="0.01" name="amount" value={movement.amount} onChange={updateMovement} /></Field>
        <Field label="Data"><Input required type="date" max={today()} name="date" value={movement.date} onChange={updateMovement} /></Field>
        <Field label="Descrição"><Input required maxLength={200} name="description" value={movement.description} onChange={updateMovement} /></Field>
        {movement.type === 'PRO_LABORE' && <Notice tone="sky" size="sm" role="note">Reduz o saldo, sem criar outro custo. O pró-labore para precificação fica em Custos Fixos.</Notice>}
        <Button type="submit" className="w-full sm:w-auto" disabled={busy || !movementChanges || !accounts.length}>Salvar movimento</Button>
      </Card>
    </div>
    <Card as="section" className="space-y-3"><h2 className="font-semibold">Movimentos</h2><p className="text-sm text-slate-500">Vendas e custos não atualizam estes saldos automaticamente.</p>{!loading && !movements.length && <p>Nenhum movimento registrado.</p>}{!loading && movements.map(m => <article key={m.id} className="border-t border-slate-100 py-3"><p className="font-medium">{labels[m.type]} · {formatCurrencyBRL(m.amount)}</p><p>{m.description}</p><p className="text-sm text-slate-500">{formatDateBR(m.date)} · {accountName(m.accountId)}{m.destinationId && ` → ${accountName(m.destinationId)}`}</p></article>)}</Card>
  </div>
}
