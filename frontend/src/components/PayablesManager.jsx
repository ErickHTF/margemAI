import { useState, useId } from 'react'
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Edit3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import PageHeader from './PageHeader'
import TipButton from './TipButton'
import ConfirmDialog from './ConfirmDialog'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Input,
  Notice,
  Select,
  SegmentedControl
} from './ui'
import { selectContextualPill } from '../data/sebraePills'
import useApiResource from '../hooks/useApiResource'
import useDraft from '../hooks/useDraft'
import payableService from '../services/payableService'
import {
  formatCurrencyBRL,
  formatDateBR,
  maskCurrency,
  unmaskCurrency,
  currencyToDigits
} from '../utils/formatters'
import {
  PAYABLE_CATEGORIES,
  getPayableStatusConfig,
  calculateRemainingBalance
} from '../utils/payables'

const currentYearMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const formatCompetencyLabel = (ymStr) => {
  if (!ymStr) return ''
  const [year, month] = ymStr.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' })
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`
}

const shiftMonth = (ymStr, delta) => {
  const [year, month] = ymStr.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const emptyForm = (defaultCompetency) => ({
  description: '',
  category: 'OUTRO',
  dueDate: '',
  totalAmount: '',
  competency: defaultCompetency,
  notes: ''
})

export default function PayablesManager() {
  const formId = useId()
  const paymentId = useId()

  const [competency, setCompetency] = useState(currentYearMonth)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(() => emptyForm(currentYearMonth()))
  const [formBaseline, setFormBaseline] = useState(null)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payingAccount, setPayingAccount] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  const [reverseConfirmAccount, setReverseConfirmAccount] = useState(null)
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState(null)

  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failure, setFailure] = useState('')

  const { data: summaryData, loading, error, reload } = useApiResource(
    () => payableService.list({
      competency,
      status: statusFilter || undefined,
      category: categoryFilter || undefined
    }),
    [competency, statusFilter, categoryFilter],
    {
      errorMessage: 'Erro ao carregar contas a pagar da competência.'
    }
  )

  const items = summaryData?.items || []
  const summary = summaryData || {
    totalCommittedExpense: 0,
    totalEffectiveDisbursement: 0,
    totalOpenPayable: 0,
    totalOverduePayable: 0
  }

  const handleOpenNew = () => {
    const initial = emptyForm(competency)
    setEditingId(null)
    setFormData(initial)
    setFormBaseline(initial)
    setFailure('')
    setFormOpen(true)
  }

  const handleOpenEdit = (acc) => {
    const initial = {
      description: acc.description || '',
      category: acc.category || 'OUTRO',
      dueDate: acc.dueDate || '',
      totalAmount: currencyToDigits(acc.totalAmount),
      competency: acc.competency || competency,
      notes: acc.notes || ''
    }
    setEditingId(acc.id)
    setFormData(initial)
    setFormBaseline(initial)
    setFailure('')
    setFormOpen(true)
  }

  const handleSaveAccount = async (e) => {
    e.preventDefault()
    const totalAmountValue = unmaskCurrency(formData.totalAmount)
    if (totalAmountValue <= 0) {
      setFailure('Informe um valor total maior que zero.')
      return
    }
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      const payload = {
        description: formData.description,
        category: formData.category,
        dueDate: formData.dueDate,
        totalAmount: totalAmountValue,
        competency: formData.competency,
        notes: formData.notes
      }

      if (editingId) {
        await payableService.update(editingId, payload)
        setFeedback('Conta a pagar atualizada com sucesso.')
      } else {
        await payableService.create(payload)
        setFeedback('Conta a pagar cadastrada com sucesso.')
      }
      setFormOpen(false)
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao salvar a conta a pagar.')
    } finally {
      setBusy(false)
    }
  }

  const handleOpenPay = (acc) => {
    setPayingAccount(acc)
    const remaining = calculateRemainingBalance(acc.totalAmount, acc.paidAmount)
    setPaymentAmount(currencyToDigits(remaining > 0 ? remaining : acc.totalAmount))
    setPaymentNotes('')
    setFailure('')
    setPaymentOpen(true)
  }

  const handleConfirmPay = async (e) => {
    e.preventDefault()
    if (!payingAccount) return
    const paidAmountValue = unmaskCurrency(paymentAmount)
    if (paidAmountValue <= 0) {
      setFailure('Informe um valor de pagamento maior que zero.')
      return
    }
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await payableService.pay(payingAccount.id, {
        amount: paidAmountValue,
        notes: paymentNotes || undefined
      })
      setFeedback(`Pagamento registrado para "${payingAccount.description}".`)
      setPaymentOpen(false)
      setPayingAccount(null)
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao registrar pagamento.')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmReverse = async () => {
    if (!reverseConfirmAccount) return
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await payableService.reverse(reverseConfirmAccount.id)
      setFeedback(`Pagamento estornado para "${reverseConfirmAccount.description}".`)
      setReverseConfirmAccount(null)
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao estornar pagamento.')
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirmAccount) return
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await payableService.remove(deleteConfirmAccount.id)
      setFeedback(`Conta a pagar "${deleteConfirmAccount.description}" removida.`)
      setDeleteConfirmAccount(null)
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao excluir conta a pagar.')
    } finally {
      setBusy(false)
    }
  }

  const handleGenerateRecurring = async () => {
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      const generated = await payableService.generateRecurring({
        competency
      })
      const count = generated?.length || 0
      if (count > 0) {
        setFeedback(`${count} ${count === 1 ? 'título gerado' : 'títulos gerados'} a partir dos custos fixos ativos do mês.`)
      } else {
        setFeedback('Todas as despesas recorrentes desta competência já haviam sido geradas (nenhuma duplicação realizada).')
      }
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao gerar despesas recorrentes.')
    } finally {
      setBusy(false)
    }
  }

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'PARTIAL', label: 'Parciais' },
    { value: 'PAID', label: 'Pagos' }
  ]

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={FileSpreadsheet}
        title="Contas a Pagar"
        description="Controle despesas compromissadas, gere títulos a partir dos custos fixos e registre pagamentos efetivos."
        tip={<TipButton pill={selectContextualPill({ action: 'payables' })} />}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            Icon={RefreshCw}
            data-tour="payables-generate"
            loading={busy}
            onClick={handleGenerateRecurring}
          >
            Gerar Recorrentes
          </Button>
          <Button
            Icon={Plus}
            data-tour="payables-new"
            onClick={handleOpenNew}
          >
            Nova Conta
          </Button>
        </div>
      </PageHeader>

      {failure && <Notice tone="rose" role="alert">{failure}</Notice>}
      {error && <Notice tone="rose" role="alert">{error}</Notice>}
      {feedback && <Notice tone="emerald">{feedback}</Notice>}

      {/* Seletor de Competência (Mês de Referência) */}
      <Card padding="sm" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <IconButton
            label="Mês anterior"
            Icon={ChevronLeft}
            tone="slate"
            size="sm"
            onClick={() => setCompetency(shiftMonth(competency, -1))}
          />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-bold text-slate-800">
              {formatCompetencyLabel(competency)}
            </span>
            <span className="text-xs text-slate-400 font-mono">({competency})</span>
          </div>
          <IconButton
            label="Próximo mês"
            Icon={ChevronRight}
            tone="slate"
            size="sm"
            onClick={() => setCompetency(shiftMonth(competency, 1))}
          />
        </div>

        <div className="flex items-center gap-2">
          {competency !== currentYearMonth() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCompetency(currentYearMonth())}
            >
              Mês Atual
            </Button>
          )}
          <Input
            type="month"
            size="sm"
            aria-label="Selecionar mês"
            className="w-40"
            value={competency}
            onChange={(e) => e.target.value && setCompetency(e.target.value)}
          />
        </div>
      </Card>

      {/* Indicadores Separando Regime de Competência e Regime de Caixa */}
      <div data-tour="payables-summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" tone="indigo" className="space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Despesa Compromissada</span>
            <Badge tone="indigo">Competência</Badge>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrencyBRL(summary.totalCommittedExpense)}
          </p>
          <p className="text-xs text-slate-500">Total gerado para o mês</p>
        </Card>

        <Card padding="md" tone="emerald" className="space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Desembolso Efetivo</span>
            <Badge tone="emerald">Caixa</Badge>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {formatCurrencyBRL(summary.totalEffectiveDisbursement)}
          </p>
          <p className="text-xs text-slate-500">Pagamentos feitos neste mês</p>
        </Card>

        <Card padding="md" tone="amber" className="space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Saldo em Aberto</span>
            <Badge tone="amber">A Pagar</Badge>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            {formatCurrencyBRL(summary.totalOpenPayable)}
          </p>
          <p className="text-xs text-slate-500">Compromissos pendentes</p>
        </Card>

        <Card padding="md" tone="rose" className="space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Vencido</span>
            <Badge tone="rose">Atrasado</Badge>
          </div>
          <p className="text-2xl font-bold text-rose-700">
            {formatCurrencyBRL(summary.totalOverduePayable)}
          </p>
          <p className="text-xs text-slate-500">Vencidas e não quitadas</p>
        </Card>
      </div>

      {/* Filtros de Status e Categoria */}
      <Card padding="sm" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="w-full sm:w-auto">
          <SegmentedControl
            label="Filtrar status"
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            size="sm"
          />
        </div>

        <div className="w-full sm:w-60">
          <Select
            size="sm"
            aria-label="Filtrar por categoria"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {PAYABLE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Lista / Tabela de Contas a Pagar */}
      <div data-tour="payables-list">
        {loading ? (
          <EmptyState loading title="Carregando contas a pagar..." />
        ) : items.length === 0 ? (
          <EmptyState
            Icon={FileSpreadsheet}
            title="Nenhuma conta a pagar encontrada"
            description={`Não há títulos registrados para ${formatCompetencyLabel(competency)} com os filtros selecionados.`}
            action={
              <div className="flex flex-wrap gap-2 justify-center">
                <Button size="sm" variant="secondary" Icon={RefreshCw} onClick={handleGenerateRecurring}>
                  Gerar dos Custos Fixos
                </Button>
                <Button size="sm" Icon={Plus} onClick={handleOpenNew}>
                  Adicionar Conta
                </Button>
              </div>
            }
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4 text-right">Valor Total</th>
                    <th className="py-3 px-4 text-right">Valor Pago</th>
                    <th className="py-3 px-4 text-right">Saldo</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((acc) => {
                    const statusConfig = getPayableStatusConfig(acc.status, acc.overdue)
                    const remaining = calculateRemainingBalance(acc.totalAmount, acc.paidAmount)
                    const isPaid = acc.status === 'PAID'
                    const hasPayment = Number(acc.paidAmount) > 0

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{acc.description}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400">
                                {acc.type === 'RECURRING' ? 'Recorrente' : 'Pontual'}
                              </span>
                              {acc.notes && (
                                <span className="text-[11px] text-slate-400 truncate max-w-xs" title={acc.notes}>
                                  · {acc.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {PAYABLE_CATEGORIES.find((c) => c.value === acc.category)?.label || acc.category || 'Outro'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={acc.overdue ? 'font-bold text-rose-600' : 'text-slate-700'}>
                            {formatDateBR(acc.dueDate)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrencyBRL(acc.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                          {formatCurrencyBRL(acc.paidAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrencyBRL(remaining)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {!isPaid && (
                              <Button
                                size="sm"
                                variant="soft"
                                Icon={DollarSign}
                                onClick={() => handleOpenPay(acc)}
                              >
                                Baixar
                              </Button>
                            )}
                            {hasPayment && (
                              <IconButton
                                label="Estornar pagamento"
                                Icon={RotateCcw}
                                tone="slate"
                                size="sm"
                                onClick={() => setReverseConfirmAccount(acc)}
                              />
                            )}
                            <IconButton
                              label="Editar conta"
                              Icon={Edit3}
                              tone="slate"
                              size="sm"
                              onClick={() => handleOpenEdit(acc)}
                            />
                            <IconButton
                              label="Excluir conta"
                              Icon={Trash2}
                              tone="rose"
                              size="sm"
                              onClick={() => setDeleteConfirmAccount(acc)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {formOpen && (
        <PayableFormDialog
          formId={formId}
          editing={Boolean(editingId)}
          value={formData}
          baseline={formBaseline}
          onChange={setFormData}
          onSubmit={handleSaveAccount}
          onCancel={() => setFormOpen(false)}
          busy={busy}
        />
      )}

      {/* Modal / Dialog de Baixa / Pagamento */}
      {paymentOpen && payingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPaymentOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${paymentId}-title`}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h2 id={`${paymentId}-title`} className="text-base font-bold text-slate-900">
                  Registrar Pagamento
                </h2>
                <p className="text-xs text-slate-500 truncate max-w-[260px]">
                  {payingAccount.description}
                </p>
              </div>
            </div>

            <Card padding="sm" tone="muted" className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Total:</span>
                <span className="font-semibold text-slate-900">{formatCurrencyBRL(payingAccount.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Já Pago:</span>
                <span className="font-semibold text-emerald-700">{formatCurrencyBRL(payingAccount.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1">
                <span className="text-slate-700 font-semibold">Saldo Restante:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrencyBRL(calculateRemainingBalance(payingAccount.totalAmount, payingAccount.paidAmount))}
                </span>
              </div>
            </Card>

            {payingAccount.payments?.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <p className="font-semibold text-slate-700">Pagamentos registrados</p>
                <ul className="space-y-1">
                  {payingAccount.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">{formatDateBR(payment.paidAt?.slice(0, 10))}</span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-900">
                        {formatCurrencyBRL(payment.amount)}
                        {payment.reversedAt && <Badge tone="slate">Estornado</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleConfirmPay} className="space-y-4">
              <Field label="Valor do Pagamento (R$)" hint="Você pode registrar quitação total ou parcial.">
                <Input
                  required
                  type="text"
                  inputMode="numeric"
                  prefix="R$"
                  placeholder="0,00"
                  value={maskCurrency(paymentAmount)}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </Field>

              <Field label="Anotações do Pagamento (Opcional)">
                <Input
                  maxLength={500}
                  placeholder="Ex.: Pago via Pix, comprovante #994"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </Field>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
                <Button variant="secondary" onClick={() => setPaymentOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={busy}>
                  Confirmar Baixa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ConfirmDialog de Estorno */}
      <ConfirmDialog
        open={reverseConfirmAccount !== null}
        title="Estornar Pagamento?"
        message={`Deseja estornar o pagamento realizado de ${formatCurrencyBRL(reverseConfirmAccount?.paidAmount)} para "${reverseConfirmAccount?.description}"? O valor será restaurado para em aberto mantendo registro de auditoria.`}
        confirmLabel="Estornar Pagamento"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmReverse}
        onCancel={() => setReverseConfirmAccount(null)}
      />

      {/* ConfirmDialog de Exclusão */}
      <ConfirmDialog
        open={deleteConfirmAccount !== null}
        title="Excluir Conta a Pagar?"
        message={`Tem certeza que deseja remover permanentemente o registro de "${deleteConfirmAccount?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir Conta"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmAccount(null)}
      />
    </div>
  )
}

export function PayableFormDialog({ formId, editing, value, baseline, onChange, onSubmit, onCancel, busy }) {
  const { dirty, changes, guard } = useDraft(value, baseline)
  const cancel = () => guard(onCancel)
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={cancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-6 space-y-4"
      >
        <h2 id={`${formId}-title`} className="text-lg font-bold text-slate-900">
          {editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
        </h2>
        {dirty && (
          <p role="status" className="text-sm text-amber-700">
            {changes} {changes === 1 ? 'alteração não salva' : 'alterações não salvas'}
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Descrição da Despesa" hint="Ex.: Aluguel do ponto, DAS-MEI, Fornecedor">
            <Input
              required
              maxLength={200}
              placeholder="Nome ou descrição da conta"
              value={value.description}
              onChange={set('description')}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoria">
              <Select value={value.category} onChange={set('category')}>
                {PAYABLE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Competência (Mês)">
              <Input required type="month" value={value.competency} onChange={set('competency')} />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Data de Vencimento">
              <Input required type="date" value={value.dueDate} onChange={set('dueDate')} />
            </Field>

            <Field label="Valor Total (R$)">
              <Input
                required
                type="text"
                inputMode="numeric"
                prefix="R$"
                placeholder="0,00"
                value={maskCurrency(value.totalAmount)}
                onChange={set('totalAmount')}
              />
            </Field>
          </div>

          <Field label="Observações (Opcional)">
            <Input
              maxLength={500}
              placeholder="Detalhes, boleto, linha digitável ou pix"
              value={value.notes}
              onChange={set('notes')}
            />
          </Field>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto" loading={busy} disabled={!dirty}>
              {editing ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
