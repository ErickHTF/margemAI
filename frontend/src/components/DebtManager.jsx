import { useState, useMemo, useCallback } from 'react'
import {
  Scale,
  Plus,
  Coins,
  Calendar,
  Trash2,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Percent,
  Calculator,
  AlertTriangle
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
import { getPillById } from '../data/sebraePills'
import useApiResource from '../hooks/useApiResource'
import useDraft from '../hooks/useDraft'
import { debtService } from '../services/debtService'
import {
  calculateDebtCost,
  calculatePmt,
  filterScheduleByStatus,
  scheduleParamsFor,
  sortDebtsBySebraePriority
} from '../utils/debts'
import { formatCurrencyBRL, formatDateBR, maskCurrency, unmaskCurrency, currencyToDigits } from '../utils/formatters'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const emptyDebtForm = () => ({
  creditor: '',
  description: '',
  principalAmount: '',
  monthlyInterestRate: '',
  fixedFeesAmount: '',
  totalInstallments: '',
  installmentAmount: '',
  firstDueDate: today()
})

const TAB_OPTIONS = [
  { value: 'overview', label: 'Contratos e Resumo', Icon: Scale },
  { value: 'simulation', label: 'Simulador de Quitação', Icon: Calculator },
  { value: 'schedule', label: 'Cronograma de Parcelas', Icon: Calendar }
]

export default function DebtManager() {
  const [activeTab, setActiveTab] = useState('overview')
  const [showNewForm, setShowNewForm] = useState(false)
  const [formData, setFormData] = useState(emptyDebtForm)
  const { dirty: formDirty, changes: formChanges, markSaved, guard } = useDraft(formData)
  const [expandedDebtId, setExpandedDebtId] = useState(null)
  const [installmentsByDebt, setInstallmentsByDebt] = useState({})
  const [loadingInstallmentsId, setLoadingInstallmentsId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failure, setFailure] = useState('')

  // Simulação de quitação
  const [simDebtId, setSimDebtId] = useState('')
  const [simMode, setSimMode] = useState('installments') // 'installments' | 'budget'
  const [simInstallmentsCount, setSimInstallmentsCount] = useState('2')
  const [simBudgetAmount, setSimBudgetAmount] = useState('')
  const [simCustomDiscountRate, setSimCustomDiscountRate] = useState('')
  const [simulationResult, setSimulationResult] = useState(null)
  const [simulating, setSimulating] = useState(false)

  // Baixa de parcela
  const [payingInstallment, setPayingInstallment] = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(today())
  const [payNotes, setPayNotes] = useState('')
  const [payingBusy, setPayingBusy] = useState(false)

  // Filtros de cronograma
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState('ALL')

  const {
    data: debtsData,
    loading: loadingDebts,
    error: errorDebts,
    reload: reloadDebts
  } = useApiResource(() => debtService.list(), [], {
    initialData: [],
    errorMessage: 'Erro ao carregar a lista de dívidas.'
  })

  const {
    data: summaryData,
    error: errorSummary,
    reload: reloadSummary
  } = useApiResource(() => debtService.getSummary(), [], {
    initialData: null,
    errorMessage: 'Erro ao carregar o resumo de dívidas.'
  })

  const {
    data: scheduleData,
    loading: loadingSchedule,
    error: errorSchedule,
    reload: reloadSchedule
  } = useApiResource(
    () => debtService.getSchedule(scheduleParamsFor(scheduleStatusFilter)),
    [scheduleStatusFilter],
    {
      initialData: [],
      errorMessage: 'Erro ao carregar o cronograma de parcelas.'
    }
  )

  const debts = useMemo(() => {
    return sortDebtsBySebraePriority(debtsData || [])
  }, [debtsData])

  const schedule = useMemo(
    () => filterScheduleByStatus(scheduleData || [], scheduleStatusFilter),
    [scheduleData, scheduleStatusFilter]
  )

  const loadDebtInstallments = useCallback(async (debtId) => {
    setLoadingInstallmentsId(debtId)
    try {
      const detail = await debtService.get(debtId)
      setInstallmentsByDebt((prev) => ({ ...prev, [debtId]: detail.installments || [] }))
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao carregar as parcelas do contrato.')
    } finally {
      setLoadingInstallmentsId((current) => (current === debtId ? null : current))
    }
  }, [])

  const reloadAll = useCallback(() => {
    reloadDebts()
    reloadSummary()
    reloadSchedule()
    setInstallmentsByDebt({})
    if (expandedDebtId) loadDebtInstallments(expandedDebtId)
  }, [reloadDebts, reloadSummary, reloadSchedule, expandedDebtId, loadDebtInstallments])

  const handleToggleInstallments = (debtId) => {
    if (expandedDebtId === debtId) {
      setExpandedDebtId(null)
      return
    }
    setExpandedDebtId(debtId)
    if (!installmentsByDebt[debtId]) loadDebtInstallments(debtId)
  }

  const closeNewForm = () => guard(() => {
    setFormData(emptyDebtForm())
    setShowNewForm(false)
  })

  // Cálculo prévio em tempo real para o formulário
  const previewCost = useMemo(() => {
    const principal = unmaskCurrency(formData.principalAmount) || 0
    const rate = Number(formData.monthlyInterestRate) || 0
    const totalInst = Number(formData.totalInstallments) || 0
    const fees = unmaskCurrency(formData.fixedFeesAmount) || 0

    let instAmount = unmaskCurrency(formData.installmentAmount) || 0
    if (!instAmount && principal > 0 && totalInst > 0) {
      instAmount = calculatePmt({
        principalAmount: principal,
        monthlyInterestRate: rate,
        totalInstallments: totalInst
      })
    }

    return calculateDebtCost({
      principalAmount: principal,
      installmentAmount: instAmount,
      totalInstallments: totalInst,
      fixedFeesAmount: fees
    })
  }, [formData])

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAutoCalcPmt = () => {
    const principal = unmaskCurrency(formData.principalAmount) || 0
    const rate = Number(formData.monthlyInterestRate) || 0
    const totalInst = Number(formData.totalInstallments) || 0
    if (principal > 0 && totalInst > 0) {
      const pmt = calculatePmt({
        principalAmount: principal,
        monthlyInterestRate: rate,
        totalInstallments: totalInst
      })
      setFormData((prev) => ({ ...prev, installmentAmount: currencyToDigits(pmt) }))
    }
  }

  const handleSubmitDebt = async (e) => {
    e.preventDefault()
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      const instVal = unmaskCurrency(formData.installmentAmount)
      const payload = {
        creditor: formData.creditor.trim(),
        description: formData.description.trim() || undefined,
        principalAmount: unmaskCurrency(formData.principalAmount),
        monthlyInterestRate: Number(formData.monthlyInterestRate),
        fixedFeesAmount: unmaskCurrency(formData.fixedFeesAmount),
        totalInstallments: Number(formData.totalInstallments),
        installmentAmount: instVal > 0 ? instVal : undefined,
        firstDueDate: formData.firstDueDate
      }
      await debtService.create(payload)
      setFeedback('Dívida cadastrada e parcelas geradas com sucesso!')
      const cleanForm = emptyDebtForm()
      setFormData(cleanForm)
      markSaved(cleanForm)
      setShowNewForm(false)
      reloadAll()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao cadastrar a dívida. Verifique os dados.')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteDebt = async () => {
    if (!pendingDelete) return
    setBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await debtService.remove(pendingDelete.id)
      setFeedback(`Dívida "${pendingDelete.creditor}" removida com sucesso.`)
      setPendingDelete(null)
      reloadAll()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao excluir a dívida.')
    } finally {
      setBusy(false)
    }
  }

  const handleStartSimulation = (debtId) => {
    setSimDebtId(debtId)
    setActiveTab('simulation')
    setSimulationResult(null)
    const target = debts.find((d) => d.id === debtId)
    if (target) {
      setSimCustomDiscountRate(String(target.monthlyInterestRate || ''))
    }
  }

  const handleRunSimulation = async (e) => {
    e?.preventDefault()
    if (!simDebtId) return
    setSimulating(true)
    setFailure('')
    try {
      const targetDebt = debts.find((d) => d.id === simDebtId)
      const payload = {
        simulationDate: today()
      }
      if (simCustomDiscountRate) {
        payload.monthlyDiscountRate = Number(simCustomDiscountRate)
      } else if (targetDebt) {
        payload.monthlyDiscountRate = Number(targetDebt.monthlyInterestRate)
      }

      if (simMode === 'installments' && simInstallmentsCount) {
        payload.installmentsToAnticipate = Number(simInstallmentsCount)
      } else if (simMode === 'budget' && simBudgetAmount) {
        payload.amortizeAmount = unmaskCurrency(simBudgetAmount)
      }

      const res = await debtService.simulatePayoff(simDebtId, payload)
      setSimulationResult(res)
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao realizar a simulação de quitação.')
    } finally {
      setSimulating(false)
    }
  }

  const handleOpenPayModal = (installment) => {
    setPayingInstallment(installment)
    setPayAmount(currencyToDigits(installment.amount))
    setPayDate(today())
    setPayNotes('')
    setFailure('')
    setFeedback('')
  }

  const handleConfirmPayment = async (e) => {
    e.preventDefault()
    if (!payingInstallment) return
    setPayingBusy(true)
    setFailure('')
    setFeedback('')
    try {
      await debtService.payInstallment(payingInstallment.id, {
        paidAmount: unmaskCurrency(payAmount),
        paymentDate: payDate,
        notes: payNotes.trim() || undefined
      })
      setFeedback(`Parcela nº ${payingInstallment.installmentNumber} baixada com sucesso!`)
      setPayingInstallment(null)
      reloadAll()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Erro ao registrar baixa da parcela.')
    } finally {
      setPayingBusy(false)
    }
  }

  const pill = getPillById('debt-avalanche')

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={Scale}
        title="Dívidas e Quitação"
        description="Gerencie empréstimos, compare o custo real e simule a quitação antecipada com desconto."
        tip={<TipButton pill={pill} />}
      >
        {activeTab === 'overview' && !showNewForm && (
          <Button
            Icon={Plus}
            variant="primary"
            data-tour="debts-new"
            onClick={() => setShowNewForm(true)}
          >
            Novo Empréstimo
          </Button>
        )}
      </PageHeader>

      {(errorDebts || errorSummary || errorSchedule || failure) && (
        <Notice tone="rose">{failure || errorDebts || errorSummary || errorSchedule}</Notice>
      )}
      {feedback && <Notice tone="emerald">{feedback}</Notice>}

      <SegmentedControl
        value={activeTab}
        onChange={setActiveTab}
        options={TAB_OPTIONS}
        label="Navegação de dívidas"
      />

      {/* ABA 1: CONTRATOS E RESUMO */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Card de Resumo Financeiro */}
          {summaryData && (
            <div data-tour="debts-summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card padding="md" tone="white">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Saldo Devedor Restante
                </span>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrencyBRL(summaryData.totalOutstandingBalance)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {summaryData.pendingInstallmentsCount} parcela(s) a vencer
                </p>
              </Card>

              <Card padding="md" tone="white">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Parcelas Deste Mês
                </span>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatCurrencyBRL(summaryData.totalMonthlyCommitment)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Comprometimento imediato</p>
              </Card>

              <Card padding="md" tone="white">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Juros e Tarifas Acumuladas
                </span>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {formatCurrencyBRL(summaryData.totalEstimatedInterest)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Custo financeiro dos contratos</p>
              </Card>

              <Card padding="md" tone={summaryData.highestRateCreditor ? 'amber' : 'white'}>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Prioridade de Quitação SEBRAE
                </span>
                <p className="mt-1 text-base font-bold text-slate-900 truncate">
                  {summaryData.highestRateCreditor || 'Nenhuma dívida ativa'}
                </p>
                <p className="mt-1 text-xs text-amber-800">
                  {summaryData.highestRateCreditor
                    ? 'Dívida mais cara: quite ou antecipe primeiro'
                    : 'Parabéns, sem dívidas ativas!'}
                </p>
              </Card>
            </div>
          )}

          {/* Formulário de Novo Empréstimo */}
          {showNewForm && (
            <Card as="form" onSubmit={handleSubmitDebt} className="space-y-4" padding="lg">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-600" />
                  Cadastrar Dívida ou Financiamento
                </h2>
                <Button variant="ghost" size="sm" onClick={closeNewForm}>
                  Cancelar
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Instituição Credora" hint="Ex.: Pronampe, Banco do Brasil, Fornecedor X">
                  <Input
                    required
                    maxLength={150}
                    name="creditor"
                    value={formData.creditor}
                    onChange={handleFormChange}
                    placeholder="Nome do credor ou banco"
                  />
                </Field>

                <Field label="Descrição ou Finalidade" hint="Opcional">
                  <Input
                    maxLength={255}
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    placeholder="Ex.: Capital de Giro, Máquina Nova"
                  />
                </Field>

                <Field label="Valor Principal Tomado (R$)">
                  <Input
                    required
                    type="text"
                    inputMode="numeric"
                    prefix="R$"
                    name="principalAmount"
                    value={maskCurrency(formData.principalAmount)}
                    onChange={handleFormChange}
                    placeholder="0,00"
                  />
                </Field>

                <Field label="Taxa de Juros Mensal (% a.m.)" hint="Informe a taxa de juros do contrato">
                  <Input
                    required
                    type="number"
                    step="0.0001"
                    min="0"
                    name="monthlyInterestRate"
                    value={formData.monthlyInterestRate}
                    onChange={handleFormChange}
                    placeholder="Ex.: 2.5"
                  />
                </Field>

                <Field label="Tarifas e Taxas Fixas (R$)" hint="TAC, IOF ou tarifas embutidas no contrato">
                  <Input
                    type="text"
                    inputMode="numeric"
                    prefix="R$"
                    name="fixedFeesAmount"
                    value={maskCurrency(formData.fixedFeesAmount)}
                    onChange={handleFormChange}
                    placeholder="0,00"
                  />
                </Field>

                <Field label="Total de Parcelas Contratadas">
                  <Input
                    required
                    type="number"
                    min="1"
                    max="480"
                    name="totalInstallments"
                    value={formData.totalInstallments}
                    onChange={handleFormChange}
                    placeholder="Ex.: 12"
                  />
                </Field>

                <Field
                  label="Valor da Parcela (R$)"
                  hint="Se em branco ou clicar ao lado, calculamos automaticamente pela Tabela Price"
                >
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      prefix="R$"
                      name="installmentAmount"
                      value={maskCurrency(formData.installmentAmount)}
                      onChange={handleFormChange}
                      placeholder="0,00"
                      className="flex-1"
                    />
                    <Button variant="soft" size="sm" onClick={handleAutoCalcPmt} title="Calcular parcela">
                      Calcular
                    </Button>
                  </div>
                </Field>

                <Field label="Vencimento da 1ª Parcela">
                  <Input
                    required
                    type="date"
                    name="firstDueDate"
                    value={formData.firstDueDate}
                    onChange={handleFormChange}
                  />
                </Field>
              </div>

              {/* Painel comparativo de custo em tempo real */}
              {previewCost.totalContractedCost > 0 && (
                <Card inset tone="muted" padding="sm" className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Custo Total Contratado:</span>
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrencyBRL(previewCost.totalContractedCost)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Juros + Tarifas:</span>
                    <p className="text-sm font-bold text-amber-600">
                      {formatCurrencyBRL(previewCost.totalInterestAndFees)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Múltiplo do Principal:</span>
                    <p className="text-sm font-bold text-slate-900">
                      {previewCost.effectiveCostMultiple}x
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Acréscimo Efetivo Total:</span>
                    <p className="text-sm font-bold text-indigo-700">
                      +{previewCost.effectiveCostPercent}%
                    </p>
                  </div>
                </Card>
              )}

              {formDirty && (
                <p role="status" className="text-sm text-amber-700">
                  {formChanges} {formChanges === 1 ? 'alteração não salva' : 'alterações não salvas'}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={closeNewForm}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={busy}
                  disabled={busy || !formDirty || !formData.creditor.trim() || !formData.principalAmount}
                  className="w-full sm:w-auto"
                >
                  Salvar Dívida e Gerar Parcelas
                </Button>
              </div>
            </Card>
          )}

          {/* Lista de Contratos */}
          {loadingDebts ? (
            <EmptyState loading title="Carregando contratos de dívidas..." />
          ) : debts.length === 0 ? (
            <EmptyState
              Icon={Scale}
              title="Nenhuma dívida cadastrada"
              description="Cadastre seus empréstimos e financiamentos para ter clareza do custo real, acompanhar vencimentos e simular descontos de quitação antecipada."
              action={
                <Button
                  variant="primary"
                  Icon={Plus}
                  onClick={() => setShowNewForm(true)}
                >
                  Cadastrar Primeira Dívida
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4">
              {debts.map((debt) => {
                const isExpanded = expandedDebtId === debt.id
                const installments = installmentsByDebt[debt.id]
                const installmentsPanelId = `debt-installments-${debt.id}`
                const isPriority1 = debt.priorityRank === 1

                return (
                  <Card key={debt.id} padding="md" tone={debt.status === 'ACTIVE' ? 'white' : 'muted'}>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-lg truncate">
                            {debt.creditor}
                          </h3>
                          {debt.status === 'ACTIVE' ? (
                            <Badge tone="indigo">Ativa</Badge>
                          ) : (
                            <Badge tone="emerald" Icon={CheckCircle2}>Quitada</Badge>
                          )}
                          {isPriority1 && (
                            <Badge tone="amber" Icon={AlertTriangle}>
                              Prioridade SEBRAE #1 (Maior Taxa)
                            </Badge>
                          )}
                        </div>
                        {debt.description && (
                          <p className="text-sm text-slate-600">{debt.description}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          Contratado: {formatCurrencyBRL(debt.principalAmount)} em {debt.totalInstallments}x de{' '}
                          {formatCurrencyBRL(debt.installmentAmount)} • Taxa: {debt.monthlyInterestRate}% a.m.
                          {Number(debt.fixedFeesAmount) > 0 && ` • Tarifas: ${formatCurrencyBRL(debt.fixedFeesAmount)}`}
                        </p>
                      </div>

                      {/* Métricas do Contrato */}
                      <Card inset tone="muted" padding="sm" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">Saldo Restante</span>
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrencyBRL(debt.remainingBalance)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">Parcelas</span>
                          <p className="text-sm font-bold text-slate-900">
                            {debt.remainingInstallments} de {debt.totalInstallments}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">Custo Total</span>
                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrencyBRL(debt.totalContractedCost)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">Múltiplo Efetivo</span>
                          <p className="text-sm font-bold text-indigo-700">
                            {debt.effectiveCostMultiple}x (+{debt.effectiveCostPercent}%)
                          </p>
                        </div>
                      </Card>

                      {/* Ações */}
                      <div className="flex flex-wrap items-center gap-2">
                        {debt.status === 'ACTIVE' && (
                          <Button
                            variant="soft"
                            size="sm"
                            Icon={Sparkles}
                            onClick={() => handleStartSimulation(debt.id)}
                          >
                            Simular Quitação
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          Icon={isExpanded ? ChevronUp : ChevronDown}
                          aria-expanded={isExpanded}
                          aria-controls={installmentsPanelId}
                          onClick={() => handleToggleInstallments(debt.id)}
                        >
                          {isExpanded ? 'Ocultar' : 'Parcelas'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          Icon={Trash2}
                          onClick={() => setPendingDelete(debt)}
                          aria-label={`Excluir ${debt.creditor}`}
                        />
                      </div>
                    </div>

                    {/* Expansão das parcelas deste contrato */}
                    {isExpanded && !installments && loadingInstallmentsId === debt.id && (
                      <EmptyState loading title="Carregando parcelas..." />
                    )}
                    {isExpanded && installments && (
                      <div id={installmentsPanelId} className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Parcelas de {debt.creditor}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500">
                                <th className="py-2 px-2">Nº</th>
                                <th className="py-2 px-2">Vencimento</th>
                                <th className="py-2 px-2">Valor Nominal</th>
                                <th className="py-2 px-2">Status</th>
                                <th className="py-2 px-2">Valor Pago</th>
                                <th className="py-2 px-2 text-right">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {installments.map((inst) => (
                                <tr key={inst.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                  <td className="py-2 px-2 font-medium">
                                    {inst.installmentNumber}/{debt.totalInstallments}
                                  </td>
                                  <td className="py-2 px-2">{formatDateBR(inst.dueDate)}</td>
                                  <td className="py-2 px-2 font-semibold">
                                    {formatCurrencyBRL(inst.amount)}
                                  </td>
                                  <td className="py-2 px-2">
                                    {inst.status === 'PAID' && <Badge tone="emerald">Paga</Badge>}
                                    {inst.status === 'PAID_EARLY' && <Badge tone="emerald">Paga Antecipada</Badge>}
                                    {inst.status === 'PENDING' && (
                                      inst.overdue ? (
                                        <Badge tone="rose">Atrasada</Badge>
                                      ) : (
                                        <Badge tone="slate">Pendente</Badge>
                                      )
                                    )}
                                  </td>
                                  <td className="py-2 px-2">
                                    {inst.paidAmount ? (
                                      <span>
                                        {formatCurrencyBRL(inst.paidAmount)}{' '}
                                        <span className="text-[10px] text-slate-400">
                                          ({formatDateBR(inst.paidAt)})
                                        </span>
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    {inst.status === 'PENDING' && (
                                      <Button
                                        size="sm"
                                        variant="soft"
                                        onClick={() => handleOpenPayModal(inst)}
                                      >
                                        Dar Baixa
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: SIMULADOR DE QUITAÇÃO ANTECIPADA */}
      {activeTab === 'simulation' && (
        <div data-tour="debts-simulation" className="space-y-6">
          <Card padding="lg" tone="white" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Simulador de Quitação Antecipada (CDC Art. 52, § 2º)
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Conforme a legislação brasileira e normas do Banco Central, ao antecipar parcelas de um financiamento,
                você tem direito ao abatimento proporcional dos juros futuros.
              </p>
            </div>

            <form onSubmit={handleRunSimulation} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Escolha a Dívida">
                <Select
                  value={simDebtId}
                  onChange={(e) => {
                    setSimDebtId(e.target.value)
                    setSimulationResult(null)
                    const target = debts.find((d) => d.id === e.target.value)
                    if (target) {
                      setSimCustomDiscountRate(String(target.monthlyInterestRate || ''))
                    }
                  }}
                  required
                >
                  <option value="">Selecione uma dívida ativa</option>
                  {debts
                    .filter((d) => d.status === 'ACTIVE')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.creditor} ({d.remainingInstallments} parcelas pendentes - {d.monthlyInterestRate}% a.m.)
                      </option>
                    ))}
                </Select>
              </Field>

              <Field label="Forma de Simulação">
                <Select value={simMode} onChange={(e) => setSimMode(e.target.value)}>
                  <option value="installments">Quantidade de parcelas finais</option>
                  <option value="budget">Valor disponível para amortizar (R$)</option>
                </Select>
              </Field>

              {simMode === 'installments' ? (
                <Field label="Parcelas Finais a Antecipar" hint="Abate do fim para o início (maior economia)">
                  <Input
                    type="number"
                    min="1"
                    max="480"
                    value={simInstallmentsCount}
                    onChange={(e) => setSimInstallmentsCount(e.target.value)}
                    placeholder="Ex.: 3"
                    required
                  />
                </Field>
              ) : (
                <Field label="Valor Disponível (R$)" hint="Calcula quantas parcelas finais cabem">
                  <Input
                    type="text"
                    inputMode="numeric"
                    prefix="R$"
                    value={maskCurrency(simBudgetAmount)}
                    onChange={(e) => setSimBudgetAmount(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </Field>
              )}

              <Field
                label="Taxa de Desconto Mensal (% a.m.)"
                hint="Por padrão, a taxa contratual da dívida"
              >
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={simCustomDiscountRate}
                  onChange={(e) => setSimCustomDiscountRate(e.target.value)}
                  placeholder="Ex.: 2.5"
                />
              </Field>

              <div className="sm:col-span-2 lg:col-span-2 flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={simulating}
                  disabled={simulating || !simDebtId}
                  className="w-full sm:w-auto"
                  Icon={Calculator}
                >
                  Simular Desconto de Quitação
                </Button>
              </div>
            </form>
          </Card>

          {/* Resultado da Simulação */}
          {simulationResult && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card padding="md" tone="white">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Valor Original (Sem Desconto)
                  </span>
                  <p className="mt-1 text-2xl font-bold text-slate-400 line-through">
                    {formatCurrencyBRL(simulationResult.originalTotalAmount)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Soma de {simulationResult.installmentsCount} parcela(s)
                  </p>
                </Card>

                <Card padding="md" tone="emerald">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                    Valor de Quitação Antecipada
                  </span>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {formatCurrencyBRL(simulationResult.payoffAmount)}
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Valor presente com juros abatidos
                  </p>
                </Card>

                <Card padding="md" tone="white">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Economia em Juros (R$)
                  </span>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    {formatCurrencyBRL(simulationResult.estimatedSavings)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Dinheiro que fica no seu caixa
                  </p>
                </Card>

                <Card padding="md" tone="white">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Desconto Efetivo
                  </span>
                  <p className="mt-1 text-2xl font-bold text-indigo-600">
                    {simulationResult.savingsPercent}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Parcelas: {simulationResult.simulatedInstallmentNumbers.join(', ')}
                  </p>
                </Card>
              </div>

              {/* Hipóteses Explícitas Obrigatórias */}
              <Card padding="lg" tone="muted" className="space-y-2">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600" />
                  Hipóteses e Premissas Explícitas do Cálculo
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                  {simulationResult.assumptions.map((assumption, index) => (
                    <li key={index} className="leading-relaxed">
                      {assumption}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: CRONOGRAMA DE PARCELAS */}
      {activeTab === 'schedule' && (
        <div data-tour="debts-schedule" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Cronograma Consolidado de Vencimentos
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 whitespace-nowrap">Filtrar por:</span>
              <Select
                value={scheduleStatusFilter}
                onChange={(e) => setScheduleStatusFilter(e.target.value)}
                size="sm"
                className="w-full sm:w-48"
              >
                <option value="ALL">Todas as parcelas</option>
                <option value="PENDING">Apenas a vencer (Pendentes)</option>
                <option value="PAID">Apenas pagas</option>
              </Select>
            </div>
          </div>

          {loadingSchedule ? (
            <EmptyState loading title="Carregando cronograma..." />
          ) : schedule.length === 0 ? (
            <EmptyState
              Icon={Calendar}
              title="Nenhuma parcela encontrada"
              description="Nenhum vencimento corresponde aos filtros selecionados."
            />
          ) : (
            <div className="grid gap-3">
              {schedule.map((inst) => (
                <Card
                  key={inst.id}
                  padding="sm"
                  tone={inst.overdue ? 'rose' : inst.status !== 'PENDING' ? 'muted' : 'white'}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{inst.creditor}</span>
                        <span className="text-xs text-slate-500">
                          (Parcela {inst.installmentNumber} de {inst.totalInstallments})
                        </span>
                        {inst.status === 'PAID' && <Badge tone="emerald">Paga</Badge>}
                        {inst.status === 'PAID_EARLY' && <Badge tone="emerald">Paga Antecipada</Badge>}
                        {inst.status === 'PENDING' && (
                          inst.overdue ? (
                            <Badge tone="rose">Vencida em {formatDateBR(inst.dueDate)}</Badge>
                          ) : (
                            <Badge tone="slate">Vence {formatDateBR(inst.dueDate)}</Badge>
                          )
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Vencimento: {formatDateBR(inst.dueDate)}
                        {inst.paidAmount && ` • Pago: ${formatCurrencyBRL(inst.paidAmount)} em ${formatDateBR(inst.paidAt)}`}
                        {inst.notes && ` • Obs: ${inst.notes}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-base font-bold text-slate-900">
                        {formatCurrencyBRL(inst.amount)}
                      </span>

                      {inst.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleOpenPayModal(inst)}
                        >
                          Dar Baixa
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal / Diálogo de Baixa de Parcela */}
      {payingInstallment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
        >
          <Card as="form" onSubmit={handleConfirmPayment} padding="lg" className="w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Dar Baixa na Parcela {payingInstallment.installmentNumber}
            </h3>
            <p className="text-xs text-slate-500">
              {payingInstallment.creditor} • Vencimento original: {formatDateBR(payingInstallment.dueDate)}
            </p>

            <Field label="Valor Pago Efetivo (R$)">
              <Input
                required
                type="text"
                inputMode="numeric"
                prefix="R$"
                placeholder="0,00"
                value={maskCurrency(payAmount)}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </Field>

            <Field label="Data do Pagamento">
              <Input
                required
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </Field>

            <Field label="Observações" hint="Opcional">
              <Input
                maxLength={255}
                placeholder="Ex.: Pago via Pix com desconto de antecipação"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
              />
            </Field>

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setPayingInstallment(null)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={payingBusy}
                className="w-full sm:w-auto"
              >
                Confirmar Baixa
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir dívida e parcelas?"
        message={`Tem certeza que deseja excluir o contrato com "${pendingDelete?.creditor}"? Todas as parcelas vinculadas serão removidas.`}
        confirmLabel="Excluir dívida"
        cancelLabel="Manter dívida"
        onConfirm={handleDeleteDebt}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
