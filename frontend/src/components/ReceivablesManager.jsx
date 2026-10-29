import { useState, useMemo } from 'react'
import {
  Receipt,
  Plus,
  ArrowDownCircle,
  RotateCcw,
  Trash2,
  Calendar,
  CreditCard,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search
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
  Input,
  Notice,
  SegmentedControl,
  Select
} from './ui'
import { SEBRAE_PILLS } from '../data/sebraePills'
import useApiResource from '../hooks/useApiResource'
import useDraft from '../hooks/useDraft'
import { receivableService } from '../services/receivableService'
import {
  formatCurrencyBRL,
  formatDateBR,
  maskCurrency,
  unmaskCurrency,
  currencyToDigits
} from '../utils/formatters'
import {
  RECEIVABLE_STATUS_LABELS,
  RECEIVABLE_STATUS_TONES,
  formatDateISO
} from '../utils/receivables'

const today = () => formatDateISO(new Date())

const emptyForm = () => ({
  description: '',
  grossAmount: '',
  paymentMethod: 'CREDITO_A_VISTA',
  installments: '1',
  issuedAt: today(),
  notes: ''
})

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'DEBITO', label: 'Cartão de Débito' },
  { value: 'CREDITO_A_VISTA', label: 'Crédito à Vista' },
  { value: 'CREDITO_PARCELADO', label: 'Crédito Parcelado' }
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'OVERDUE', label: 'Em Atraso' },
  { value: 'PARTIALLY_RECEIVED', label: 'Parciais' },
  { value: 'RECEIVED', label: 'Recebidos' }
]

const PAGE_SIZE = 50

export default function ReceivablesManager() {
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showNewForm, setShowNewForm] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [failure, setFailure] = useState('')
  const [busy, setBusy] = useState(false)

  // Modais de ação
  const [settleModal, setSettleModal] = useState(null) // { installment, receivable, amount, receivedAt, notes }
  const [reverseTarget, setReverseTarget] = useState(null) // installment
  const [deleteTarget, setDeleteTarget] = useState(null) // receivable

  const { dirty } = useDraft(formData, emptyForm())

  // Carregamento via useApiResource
  const { data, loading, error, reload } = useApiResource(
    () =>
      receivableService.list({
        status: statusFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
        search: search.trim() || undefined,
        page,
        size: PAGE_SIZE
      }),
    [statusFilter, paymentMethodFilter, search, page],
    { errorMessage: 'Erro ao carregar contas a receber.' }
  )

  const receivables = useMemo(() => data?.receivables?.content || [], [data])
  const totalPages = data?.receivables?.totalPages || 0

  const changeFilter = (setter) => (value) => {
    setter(value)
    setPage(0)
  }

  const pill = SEBRAE_PILLS.find((p) => p.id === 'receivables-control') || SEBRAE_PILLS.find((p) => p.id === 'working-capital')

  const handleCreateReceivable = async (e) => {
    e.preventDefault()
    const grossAmountValue = unmaskCurrency(formData.grossAmount)
    if (grossAmountValue <= 0) {
      setFailure('Informe um valor bruto maior que zero.')
      return
    }
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await receivableService.create({
        description: formData.description.trim(),
        grossAmount: grossAmountValue,
        paymentMethod: formData.paymentMethod,
        installments: formData.paymentMethod === 'CREDITO_PARCELADO' ? Math.max(2, Number(formData.installments) || 2) : 1,
        issuedAt: formData.issuedAt || today(),
        notes: formData.notes.trim() || undefined
      })
      setFormData(emptyForm())
      setShowNewForm(false)
      setFeedback('Título a receber cadastrado com sucesso.')
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Não foi possível cadastrar o título.')
    } finally {
      setBusy(false)
    }
  }

  const handleSettle = async (e) => {
    e?.preventDefault()
    if (!settleModal) return
    const settleAmountValue = unmaskCurrency(settleModal.amount)
    if (settleAmountValue <= 0) {
      setFailure('Informe um valor de baixa maior que zero.')
      return
    }
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      const payload = {
        amount: settleAmountValue,
        receivedAt: settleModal.receivedAt || today(),
        notes: settleModal.notes?.trim() || undefined
      }
      await receivableService.settleInstallment(settleModal.installment.id, payload)
      setSettleModal(null)
      setFeedback('Baixa realizada com sucesso.')
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao realizar baixa na parcela.')
    } finally {
      setBusy(false)
    }
  }

  const handleReverseConfirm = async () => {
    if (!reverseTarget) return
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await receivableService.reverseInstallment(reverseTarget.id, {
        reason: 'Estorno efetuado pelo usuário'
      })
      setReverseTarget(null)
      setFeedback('Baixa estornada com sucesso.')
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao estornar parcela.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await receivableService.delete(deleteTarget.id)
      setDeleteTarget(null)
      setFeedback('Título a receber excluído com sucesso.')
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao excluir título.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={Receipt}
        title="Contas a Receber"
        description="Acompanhe vendas faturadas, prazos de liquidação das operadoras e baixas de parcelas."
        tip={<TipButton pill={pill} />}
      >
        <Button
          Icon={Plus}
          onClick={() => setShowNewForm((prev) => !prev)}
          className="w-full sm:w-auto"
        >
          {showNewForm ? 'Cancelar' : 'Novo Título'}
        </Button>
      </PageHeader>

      {(error || failure) && <Notice tone="rose">{failure || error}</Notice>}
      {feedback && <Notice tone="emerald">{feedback}</Notice>}

      {/* Totalizadores Financeiros */}
      <section data-tour="receivables-summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Venda Bruta</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrencyBRL(data?.totalSoldGross)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Competência total</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Venda Líquida</p>
          <p className="text-xl font-bold text-indigo-700 mt-1">{formatCurrencyBRL(data?.totalSoldNet)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Após taxas operadora</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recebido Efetivo</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrencyBRL(data?.totalReceivedEffectively)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Caixa já liquidado</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">A Receber</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrencyBRL(data?.totalPending)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">No prazo regular</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Em Atraso</p>
          <p className={`text-xl font-bold mt-1 ${Number(data?.totalOverdue) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatCurrencyBRL(data?.totalOverdue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Vencidas em aberto</p>
        </Card>
      </section>

      {/* Formulário de Novo Título Manual */}
      {showNewForm && (
        <Card as="form" data-tour="receivables-new" onSubmit={handleCreateReceivable} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Novo Título a Receber Manual {dirty && <Badge tone="amber">Não salvo</Badge>}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>
              Fechar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Descrição" className="sm:col-span-2">
              <Input
                name="description"
                required
                maxLength={200}
                placeholder="Ex.: Contrato consultoria ou venda balcão"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Field>

            <Field label="Valor bruto (R$)">
              <Input
                type="text"
                inputMode="numeric"
                required
                prefix="R$"
                placeholder="0,00"
                value={maskCurrency(formData.grossAmount)}
                onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
              />
            </Field>

            <Field label="Data de emissão">
              <Input
                type="date"
                required
                value={formData.issuedAt}
                onChange={(e) => setFormData({ ...formData, issuedAt: e.target.value })}
              />
            </Field>

            <Field label="Forma de pagamento">
              <Select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </Select>
            </Field>

            {formData.paymentMethod === 'CREDITO_PARCELADO' && (
              <Field label="Número de parcelas">
                <Select
                  value={formData.installments}
                  onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                    <option key={num} value={num}>
                      {num}x
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Observações" className="sm:col-span-2">
              <Input
                maxLength={500}
                placeholder="Detalhes ou identificador externo"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={busy || !formData.description.trim() || unmaskCurrency(formData.grossAmount) <= 0}
              className="w-full sm:w-auto"
            >
              Salvar Título
            </Button>
          </div>
        </Card>
      )}

      {/* Filtros e Busca */}
      <section data-tour="receivables-filter" className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <SegmentedControl
            label="Filtrar por status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={changeFilter(setStatusFilter)}
            size="sm"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Field label="" className="w-full sm:w-44">
              <Select
                value={paymentMethodFilter}
                onChange={(e) => changeFilter(setPaymentMethodFilter)(e.target.value)}
              >
                <option value="">Todas as formas</option>
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="" className="w-full sm:w-60">
              <Input
                Icon={Search}
                placeholder="Buscar por descrição..."
                value={search}
                onChange={(e) => changeFilter(setSearch)(e.target.value)}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Lista de Contas a Receber */}
      <section data-tour="receivables-list" className="space-y-4">
        {loading ? (
          <EmptyState loading title="Carregando títulos a receber..." />
        ) : receivables.length === 0 ? (
          <EmptyState
            Icon={Receipt}
            title="Nenhum título a receber encontrado"
            description="Vendas a prazo registradas ou títulos manuais aparecerão aqui com os prazos de liquidação das operadoras."
          />
        ) : (
          receivables.map((rec) => {
            const isExpanded = expandedId === rec.id
            const tone = RECEIVABLE_STATUS_TONES[rec.status] || 'amber'
            const label = RECEIVABLE_STATUS_LABELS[rec.status] || rec.status

            return (
              <Card as="article" key={rec.id} padding="none" className="overflow-hidden">
                <div
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">{rec.description}</h3>
                      <Badge tone={tone}>{label}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CreditCard className="w-3.5 h-3.5" />
                        {rec.paymentMethodDescription}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Emitido em {formatDateBR(rec.issuedAt)} · {rec.installmentsCount} {rec.installmentsCount === 1 ? 'parcela' : 'parcelas'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Valor Líquido</p>
                      <p className="text-base font-bold text-slate-900">{formatCurrencyBRL(rec.netAmount)}</p>
                      <p className="text-xs text-emerald-600 font-medium">
                        Recebido: {formatCurrencyBRL(rec.receivedAmount)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        Icon={isExpanded ? ChevronUp : ChevronDown}
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedId(isExpanded ? null : rec.id)
                        }}
                      >
                        {isExpanded ? 'Ocultar' : 'Parcelas'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        tone="rose"
                        Icon={Trash2}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(rec)
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Lista Expandida de Parcelas */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <Card inset tone="muted" padding="sm" className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Parcelas do Título
                      </h4>
                      <div className="space-y-2">
                        {rec.installments?.map((inst) => {
                          const instTone = RECEIVABLE_STATUS_TONES[inst.status] || 'amber'
                          const instLabel = RECEIVABLE_STATUS_LABELS[inst.status] || inst.status

                          return (
                            <Card
                              key={inst.id}
                              inset
                              padding="sm"
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-slate-900">
                                    Parcela {inst.installmentNumber}/{inst.totalInstallments}
                                  </span>
                                  <Badge tone={instTone}>{instLabel}</Badge>
                                  {inst.overdue && <Badge tone="rose">Atrasado</Badge>}
                                </div>
                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  Vencimento: <span className="font-medium text-slate-700">{formatDateBR(inst.dueDate)}</span>
                                  {inst.receivedAt && (
                                    <> · Liquidado em {formatDateBR(inst.receivedAt)}</>
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4">
                                <div className="text-left sm:text-right">
                                  <p className="text-xs text-slate-500">
                                    Líquido: <span className="font-semibold text-slate-900">{formatCurrencyBRL(inst.netAmount)}</span>
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Recebido: <span className="font-semibold text-emerald-600">{formatCurrencyBRL(inst.receivedAmount)}</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {inst.status !== 'RECEIVED' && (
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      Icon={ArrowDownCircle}
                                      onClick={() =>
                                        setSettleModal({
                                          installment: inst,
                                          receivable: rec,
                                          amount: currencyToDigits(inst.remainingAmount || inst.netAmount),
                                          receivedAt: today(),
                                          notes: ''
                                        })
                                      }
                                    >
                                      Baixar
                                    </Button>
                                  )}

                                  {Number(inst.receivedAmount) > 0 && (
                                    <Button
                                      size="sm"
                                      variant="soft"
                                      tone="rose"
                                      Icon={RotateCcw}
                                      onClick={() => setReverseTarget(inst)}
                                    >
                                      Estornar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </Card>
                  </div>
                )}
              </Card>
            )
          })
        )}

        {(totalPages > 1 || page > 0) && (
          <nav aria-label="Paginação dos títulos" className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              Icon={ChevronLeft}
              disabled={loading || page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Anterior
            </Button>
            <p className="text-xs text-slate-500">
              Página {page + 1} de {Math.max(totalPages, page + 1)}
            </p>
            <Button
              variant="secondary"
              size="sm"
              TrailingIcon={ChevronRight}
              disabled={loading || page + 1 >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </nav>
        )}
      </section>

      {/* Modal / Diálogo de Baixa (Parcial ou Total) */}
      {settleModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        >
          <Card as="form" onSubmit={handleSettle} padding="lg" className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Liquidar Parcela {settleModal.installment.installmentNumber}/{settleModal.installment.totalInstallments}
            </h3>
            <p className="text-xs text-slate-500">
              {settleModal.receivable.description} · Saldo em aberto: {formatCurrencyBRL(settleModal.installment.remainingAmount)}
            </p>

            <Field label="Valor recebido (R$)" hint="Você pode registrar baixa total ou parcial.">
              <Input
                type="text"
                inputMode="numeric"
                required
                prefix="R$"
                placeholder="0,00"
                value={maskCurrency(settleModal.amount)}
                onChange={(e) => setSettleModal({ ...settleModal, amount: e.target.value })}
              />
            </Field>

            <Field label="Data do recebimento">
              <Input
                type="date"
                required
                value={settleModal.receivedAt}
                onChange={(e) => setSettleModal({ ...settleModal, receivedAt: e.target.value })}
              />
            </Field>

            <Field label="Observações (opcional)">
              <Input
                maxLength={500}
                placeholder="Ex.: Recebido na conta PJ"
                value={settleModal.notes}
                onChange={(e) => setSettleModal({ ...settleModal, notes: e.target.value })}
              />
            </Field>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSettleModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" loading={busy} disabled={busy || unmaskCurrency(settleModal.amount) <= 0}>
                Confirmar Baixa
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal / Diálogo de Estorno */}
      <ConfirmDialog
        open={Boolean(reverseTarget)}
        title="Estornar Baixa da Parcela"
        message={`Deseja realmente estornar o valor de ${formatCurrencyBRL(reverseTarget?.receivedAmount)}? O status da parcela voltará a ser aberto.`}
        confirmLabel="Confirmar Estorno"
        cancelLabel="Cancelar"
        onCancel={() => setReverseTarget(null)}
        onConfirm={handleReverseConfirm}
      />

      {/* Modal / Diálogo de Exclusão */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Excluir Título a Receber"
        message={`Deseja excluir o título "${deleteTarget?.description}"? Todas as suas parcelas associadas serão removidas.`}
        confirmLabel="Excluir Título"
        cancelLabel="Cancelar"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
