import { useState } from 'react'
import { PiggyBank } from 'lucide-react'
import PageHeader from './PageHeader'
import TipButton from './TipButton'
import ConfirmDialog from './ConfirmDialog'
import { Badge, Button, Card, EmptyState, Field, Input, Notice, SegmentedControl, Select } from './ui'
import { SEBRAE_PILLS } from '../data/sebraePills'
import { useApiResource } from '../hooks/useApiResource'
import useDraft from '../hooks/useDraft'
import { reserveService } from '../services/reserveService'
import { accountService } from '../services/accountService'
import { formatCurrencyBRL, formatDateBR } from '../utils/formatters'
import {
  GOAL_MODES,
  MOVEMENT_TYPES,
  computeReserveSnapshot,
  validateReserveMovement
} from '../utils/reserves'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GOAL_MODE_OPTIONS = [
  { value: GOAL_MODES.FIXED_AMOUNT, label: 'Valor em R$' },
  { value: GOAL_MODES.MONTHS_OF_COSTS, label: 'Meses de custos fixos' }
]

const MOVEMENT_LABELS = {
  [MOVEMENT_TYPES.DEPOSIT]: 'Aporte na reserva',
  [MOVEMENT_TYPES.WITHDRAWAL]: 'Resgate da reserva'
}

const emptyMovement = () => ({
  type: MOVEMENT_TYPES.DEPOSIT,
  amount: '',
  occurredAt: today(),
  businessAccountId: '',
  description: ''
})

const normalizeGoalDraft = (summary) => ({
  goalMode: summary?.goalMode || GOAL_MODES.FIXED_AMOUNT,
  targetAmount: summary?.targetAmount !== undefined && summary?.targetAmount !== null ? String(summary.targetAmount) : '0',
  targetMonths: summary?.targetMonths !== undefined && summary?.targetMonths !== null ? String(summary.targetMonths || 3) : '3'
})

const INITIAL_RESOURCE = {
  summary: {
    goalMode: GOAL_MODES.FIXED_AMOUNT,
    targetAmount: 0,
    targetMonths: 0,
    monthlyFixedCosts: 0,
    effectiveTargetAmount: 0,
    missingFixedCostsForMonthsGoal: false,
    guidanceMessage: '',
    currentBalance: 0,
    reservedBalance: 0,
    totalBusinessAccountsBalance: 0,
    freeBalance: 0,
    progressPercent: 0,
    movements: []
  },
  accounts: []
}

export default function FinancialReserveManager({ onNavigate }) {
  const { data, loading, error, reload } = useApiResource(
    async () => {
      const [summary, accounts] = await Promise.all([
        reserveService.getSummary(),
        accountService.list().catch(() => [])
      ])
      return { summary, accounts: Array.isArray(accounts) ? accounts : [] }
    },
    [],
    { initialData: INITIAL_RESOURCE, errorMessage: 'Não foi possível carregar a reserva financeira.' }
  )

  const summary = data?.summary || INITIAL_RESOURCE.summary
  const accounts = data?.accounts || []

  const baselineGoal = normalizeGoalDraft(summary)
  const [goalOverrides, setGoalOverrides] = useState({})
  const goalForm = { ...baselineGoal, ...goalOverrides }
  const [movementForm, setMovementForm] = useState(emptyMovement)
  const [busyGoal, setBusyGoal] = useState(false)
  const [busyMovement, setBusyMovement] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [failure, setFailure] = useState('')
  const [confirmWithdrawalOpen, setConfirmWithdrawalOpen] = useState(false)

  const { dirty: goalDirty, changes: goalChanges, markSaved: markGoalSaved } = useDraft(goalForm, baselineGoal)
  const { dirty: movementDirty, changes: movementChanges } = useDraft(movementForm, emptyMovement())
  const totalUnsaved = goalChanges + movementChanges

  const snapshot = computeReserveSnapshot({
    goalMode: goalForm.goalMode,
    targetAmount: goalForm.targetAmount,
    targetMonths: goalForm.targetMonths,
    monthlyFixedCosts: summary.monthlyFixedCosts,
    reservedBalance: summary.reservedBalance ?? summary.currentBalance,
    totalBusinessAccountsBalance: summary.totalBusinessAccountsBalance
  })

  const handleGoalSubmit = async (event) => {
    event.preventDefault()
    setBusyGoal(true)
    setFailure('')
    setFeedback('')
    try {
      const payload = {
        goalMode: goalForm.goalMode,
        targetAmount: goalForm.goalMode === GOAL_MODES.FIXED_AMOUNT ? Number(goalForm.targetAmount) : Number(summary.targetAmount || 0),
        targetMonths: goalForm.goalMode === GOAL_MODES.MONTHS_OF_COSTS ? Number(goalForm.targetMonths) : Number(summary.targetMonths || 0)
      }
      const updated = await reserveService.updateGoal(payload)
      const nextDraft = normalizeGoalDraft(updated)
      setGoalOverrides({})
      markGoalSaved(nextDraft)
      setFeedback('Meta da reserva financeira atualizada.')
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Não foi possível salvar a meta. Verifique os valores informados.')
    } finally {
      setBusyGoal(false)
    }
  }

  const executeMovementSubmit = async () => {
    setConfirmWithdrawalOpen(false)
    setBusyMovement(true)
    setFailure('')
    setFeedback('')
    try {
      await reserveService.createMovement({
        type: movementForm.type,
        amount: Number(movementForm.amount),
        occurredAt: movementForm.occurredAt,
        description: movementForm.description.trim(),
        businessAccountId: movementForm.businessAccountId || null
      })
      setMovementForm(emptyMovement())
      setFeedback(
        movementForm.type === MOVEMENT_TYPES.DEPOSIT
          ? 'Aporte registrado na reserva financeira.'
          : 'Resgate registrado na reserva financeira.'
      )
      reload()
    } catch (err) {
      setFailure(err.response?.data?.message || 'Não foi possível registrar a movimentação.')
    } finally {
      setBusyMovement(false)
    }
  }

  const handleMovementSubmit = (event) => {
    event.preventDefault()
    setFailure('')
    setFeedback('')
    const validationError = validateReserveMovement({
      ...movementForm,
      reservedBalance: snapshot.reservedBalance
    })
    if (validationError) {
      setFailure(validationError)
      return
    }
    if (movementForm.type === MOVEMENT_TYPES.WITHDRAWAL) {
      setConfirmWithdrawalOpen(true)
      return
    }
    executeMovementSubmit()
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={PiggyBank}
        title="Reserva Financeira"
        description="Defina sua meta de segurança e acompanhe o colchão financeiro separado do caixa livre."
        tip={<TipButton pill={SEBRAE_PILLS.find((p) => p.id === 'financial-reserve')} />}
      />

      {(error || failure) && <Notice tone="rose">{failure || error}</Notice>}
      {feedback && <Notice tone="emerald">{feedback}</Notice>}
      {(goalDirty || movementDirty) && (
        <p className="text-sm text-amber-700">{totalUnsaved} alterações não salvas</p>
      )}

      {snapshot.missingFixedCostsForMonthsGoal && (
        <Notice tone="amber" title="Faltam custos fixos cadastrados">
          <div className="space-y-2">
            <p>
              Para dimensionar a meta em meses de operação, cadastre primeiro seus custos fixos mensais ativos (como aluguel, pró-labore e internet).
            </p>
            {onNavigate && (
              <Button variant="secondary" size="sm" onClick={() => onNavigate('costs')}>
                Cadastrar custos fixos
              </Button>
            )}
          </div>
        </Notice>
      )}

      {loading ? (
        <EmptyState loading title="Carregando reserva financeira..." />
      ) : (
        <section data-tour="reserves-summary" className="grid gap-4 sm:grid-cols-3">
          <Card as="article" tone="indigo" padding="md" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Saldo reservado</h2>
              <Badge tone={snapshot.progressPercent >= 100 ? 'emerald' : 'indigo'}>
                {snapshot.progressPercent.toFixed(2).replace('.', ',')}% da meta
              </Badge>
            </div>
            <p className="text-2xl font-bold">{formatCurrencyBRL(snapshot.reservedBalance)}</p>
            <p className="text-xs text-slate-600">
              {snapshot.remainingAmount > 0
                ? `Faltam ${formatCurrencyBRL(snapshot.remainingAmount)} para atingir a meta.`
                : snapshot.effectiveTargetAmount > 0
                  ? 'Meta concluída! Seu colchão de segurança está completo.'
                  : 'Configure uma meta para acompanhar o progresso.'}
            </p>
          </Card>

          <Card as="article" tone="emerald" padding="md" className="space-y-2">
            <h2 className="text-sm font-semibold">Saldo livre nas contas</h2>
            <p className="text-2xl font-bold">{formatCurrencyBRL(snapshot.freeBalance)}</p>
            <p className="text-xs text-slate-600">
              Total nas Contas Empresariais: {formatCurrencyBRL(snapshot.totalBusinessAccountsBalance)} (descontado o saldo reservado).
            </p>
          </Card>

          <Card as="article" padding="md" className="space-y-2">
            <h2 className="text-sm font-semibold">Meta efetiva da reserva</h2>
            <p className="text-2xl font-bold">{formatCurrencyBRL(snapshot.effectiveTargetAmount)}</p>
            <p className="text-xs text-slate-600">
              {goalForm.goalMode === GOAL_MODES.MONTHS_OF_COSTS
                ? `${goalForm.targetMonths || 0} meses × ${formatCurrencyBRL(summary.monthlyFixedCosts)} de custos fixos ativos`
                : 'Meta definida como valor fixo em reais'}
            </p>
          </Card>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card as="form" data-tour="reserves-goal" onSubmit={handleGoalSubmit} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Meta da reserva</h2>
            {goalDirty && <Badge tone="amber">Não salvo</Badge>}
          </div>

          <Field label="Modo da meta">
            <SegmentedControl
              label="Modo da meta da reserva"
              options={GOAL_MODE_OPTIONS}
              value={goalForm.goalMode}
              onChange={(mode) => setGoalOverrides((prev) => ({ ...prev, goalMode: mode }))}
            />
          </Field>

          {goalForm.goalMode === GOAL_MODES.FIXED_AMOUNT ? (
            <Field label="Valor da meta (R$)" hint="Quanto você deseja manter guardado para imprevistos.">
              <Input
                required
                prefix="R$"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                name="targetAmount"
                value={goalForm.targetAmount}
                onChange={(e) => setGoalOverrides((prev) => ({ ...prev, targetAmount: e.target.value }))}
              />
            </Field>
          ) : (
            <Field
              label="Meses de custos fixos"
              hint={`Custos fixos ativos atuais: ${formatCurrencyBRL(summary.monthlyFixedCosts)}/mês.`}
            >
              <Input
                required
                type="number"
                inputMode="numeric"
                min="1"
                max="120"
                step="1"
                name="targetMonths"
                value={goalForm.targetMonths}
                onChange={(e) => setGoalOverrides((prev) => ({ ...prev, targetMonths: e.target.value }))}
              />
            </Field>
          )}

          <Button type="submit" className="w-full sm:w-auto" disabled={busyGoal || !goalDirty}>
            Salvar meta
          </Button>
        </Card>

        <Card as="form" data-tour="reserves-movement" onSubmit={handleMovementSubmit} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Registrar aporte ou resgate</h2>
            {movementDirty && <Badge tone="amber">Não salvo</Badge>}
          </div>

          <Field label="Tipo de movimentação">
            <Select
              name="type"
              value={movementForm.type}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              {Object.entries(MOVEMENT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Valor (R$)">
            <Input
              required
              prefix="R$"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              name="amount"
              value={movementForm.amount}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
          </Field>

          <Field label="Data da movimentação">
            <Input
              required
              type="date"
              max={today()}
              name="occurredAt"
              value={movementForm.occurredAt}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, occurredAt: e.target.value }))}
            />
          </Field>

          <Field label="Conta empresarial vinculada (opcional)">
            <Select
              name="businessAccountId"
              value={movementForm.businessAccountId}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, businessAccountId: e.target.value }))}
            >
              <option value="">Sem vínculo específico</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Descrição">
            <Input
              required
              maxLength={200}
              placeholder="Ex.: Sobra do caixa de março ou Manutenção urgente"
              name="description"
              value={movementForm.description}
              onChange={(e) => setMovementForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </Field>

          <Notice tone="sky" size="sm" role="note">
            Aportes e resgates são transferências patrimoniais internas: não geram receita fictícia nem alteram o faturamento MEI ou o DRE.
          </Notice>

          <Button type="submit" className="w-full sm:w-auto" disabled={busyMovement || !movementDirty}>
            {movementForm.type === MOVEMENT_TYPES.WITHDRAWAL ? 'Registrar resgate' : 'Registrar aporte'}
          </Button>
        </Card>
      </div>

      <Card as="section" className="space-y-3">
        <h2 className="font-semibold">Histórico da reserva</h2>
        <p className="text-sm text-slate-500">
          Acompanhe todos os aportes e resgates realizados no seu colchão de segurança.
        </p>
        {!loading && (!summary.movements || summary.movements.length === 0) && (
          <p className="text-sm text-slate-600">Nenhuma movimentação registrada na reserva.</p>
        )}
        {!loading &&
          summary.movements?.map((movement) => (
            <article key={movement.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={movement.type === MOVEMENT_TYPES.DEPOSIT ? 'emerald' : 'amber'}>
                    {MOVEMENT_LABELS[movement.type] || movement.type}
                  </Badge>
                  <span className="font-semibold">{formatCurrencyBRL(movement.amount)}</span>
                </div>
                <p className="text-sm">{movement.description}</p>
              </div>
              <p className="text-xs text-slate-500">
                {formatDateBR(movement.occurredAt)}
                {movement.businessAccountName ? ` · ${movement.businessAccountName}` : ''}
              </p>
            </article>
          ))}
      </Card>

      <ConfirmDialog
        open={confirmWithdrawalOpen}
        title="Confirmar resgate da reserva?"
        message="Este resgate reduzirá o saldo guardado na sua reserva de emergência e o devolverá ao saldo livre, sem criar receita ou despesa no DRE."
        confirmLabel="Confirmar resgate"
        cancelLabel="Manter na reserva"
        onConfirm={executeMovementSubmit}
        onCancel={() => setConfirmWithdrawalOpen(false)}
      />
    </div>
  )
}
