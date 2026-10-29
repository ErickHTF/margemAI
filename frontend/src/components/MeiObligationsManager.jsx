import { useState } from 'react'
import {
  CalendarCheck,
  Bell,
  ExternalLink,
  FileCheck2,
  RotateCcw,
  ShieldAlert
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
import { obligationService } from '../services/obligationService'
import { getApiErrorMessage } from '../services/apiError'
import { formatDateBR } from '../utils/formatters'
import {
  OFFICIAL_MEI_LINKS,
  REGULARITY_DISCLAIMER,
  filterObligations,
  formatCompetencyLabel,
  formatDueCountdown,
  getObligationBadgeMeta,
  validateManualReceipt
} from '../utils/meiObligations'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const currentYearNumber = () => new Date().getFullYear()

const buildYearOptions = (baseYear) => [
  baseYear - 1,
  baseYear,
  baseYear + 1
]

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Todas (13)' },
  { value: 'DAS_MENSAL', label: 'DAS Mensal (12)' },
  { value: 'DASN_SIMEI_ANUAL', label: 'DASN-SIMEI Anual (1)' }
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'PENDING', label: 'Em aberto' },
  { value: 'DUE_SOON', label: 'Vencendo em breve' },
  { value: 'OVERDUE', label: 'Em atraso no controle' },
  { value: 'PAID_DECLARED', label: 'Com comprovante manual' }
]

const emptyReceiptForm = () => ({
  obligationId: '',
  manualReceiptCode: '',
  paidAt: todayISO(),
  notes: ''
})

export default function MeiObligationsManager() {
  const [selectedYear, setSelectedYear] = useState(currentYearNumber)
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [reminderInput, setReminderInput] = useState(null)
  const [receiptForm, setReceiptForm] = useState(emptyReceiptForm)
  const [receiptBaseline, setReceiptBaseline] = useState(emptyReceiptForm)
  const [receiptErrors, setReceiptErrors] = useState({})
  const [reopenTarget, setReopenTarget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')

  const {
    data: schedule,
    loading,
    error,
    reload,
    setData: setSchedule
  } = useApiResource(
    () => obligationService.getSchedule({ year: selectedYear }),
    [selectedYear],
    { errorMessage: 'Não foi possível carregar a agenda de obrigações MEI.' }
  )

  const baselineReminder = String(schedule?.reminderDaysBefore ?? 5)
  const currentReminderValue = reminderInput !== null ? reminderInput : baselineReminder
  const reminderChanged = reminderInput !== null && reminderInput !== baselineReminder
  const receiptChanged = JSON.stringify(receiptForm) !== JSON.stringify(receiptBaseline)

  const { dirty, guard } = useDraft(
    { reminder: currentReminderValue, receipt: receiptForm },
    { reminder: baselineReminder, receipt: receiptBaseline }
  )

  const obligations = schedule?.obligations || []
  const officialLinks = schedule?.officialLinks?.length ? schedule.officialLinks : OFFICIAL_MEI_LINKS
  const disclaimer = schedule?.regularityDisclaimer || REGULARITY_DISCLAIMER
  const filteredObligations = filterObligations(obligations, { typeFilter, statusFilter })

  const openReceiptEditor = (obligation) => {
    if (receiptForm.obligationId === obligation.id) return
    guard(() => {
      const form = {
        obligationId: obligation.id,
        manualReceiptCode: obligation.manualReceiptCode || '',
        paidAt: obligation.paidAt || todayISO(),
        notes: obligation.notes || ''
      }
      setFeedback('')
      setActionError('')
      setReceiptErrors({})
      setReceiptForm(form)
      setReceiptBaseline(form)
    })
  }

  const closeReceiptEditor = () => {
    const empty = emptyReceiptForm()
    setReceiptErrors({})
    setReceiptForm(empty)
    setReceiptBaseline(empty)
  }

  const changeYear = (year) => {
    guard(() => {
      setSelectedYear(year)
      setReminderInput(null)
      closeReceiptEditor()
    })
  }

  const handleReminderSubmit = async (event) => {
    event.preventDefault()
    const parsed = Number(currentReminderValue)
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 30) {
      setActionError('Informe uma antecedência de lembrete entre 1 e 30 dias.')
      return
    }
    setBusy(true)
    setFeedback('')
    setActionError('')
    try {
      const updatedSchedule = await obligationService.updateReminders({
        reminderDaysBefore: parsed,
        year: selectedYear
      })
      setSchedule(updatedSchedule)
      setReminderInput(null)
      setFeedback(`Lembretes ajustados para ${parsed} dia(s) antes do vencimento.`)
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível atualizar os lembretes.'))
    } finally {
      setBusy(false)
    }
  }

  const handleReceiptSubmit = async (event) => {
    event.preventDefault()
    const validation = validateManualReceipt({
      manualReceiptCode: receiptForm.manualReceiptCode,
      paidAt: receiptForm.paidAt,
      today: todayISO()
    })
    if (!validation.valid) {
      setReceiptErrors(validation.errors)
      return
    }
    setBusy(true)
    setFeedback('')
    setActionError('')
    setReceiptErrors({})
    try {
      await obligationService.updateStatus(receiptForm.obligationId, {
        status: 'PAID_DECLARED',
        manualReceiptCode: receiptForm.manualReceiptCode.trim(),
        paidAt: receiptForm.paidAt,
        notes: receiptForm.notes.trim() || null
      })
      closeReceiptEditor()
      setFeedback(
        'Comprovante manual anotado no seu controle interno. Confira sempre a situação fiscal oficial no PGMEI.'
      )
      reload()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível registrar o comprovante manual.'))
    } finally {
      setBusy(false)
    }
  }

  const confirmReopen = async () => {
    if (!reopenTarget) return
    const target = reopenTarget
    setReopenTarget(null)
    setBusy(true)
    setFeedback('')
    setActionError('')
    try {
      await obligationService.updateStatus(target.id, {
        status: 'PENDING',
        manualReceiptCode: null,
        paidAt: null,
        notes: null
      })
      setFeedback(`Obrigação "${target.title}" reaberta para acompanhamento.`)
      reload()
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Não foi possível reabrir a obrigação.'))
    } finally {
      setBusy(false)
    }
  }

  const yearOptions = buildYearOptions(currentYearNumber())

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={CalendarCheck}
        title="Obrigações MEI"
        description="Agenda anual do DAS e da declaração DASN-SIMEI com lembretes e controle manual de comprovantes."
        tip={<TipButton pill={getPillById('mei-obligations')} />}
      />

      <Notice
        tone="amber"
        Icon={ShieldAlert}
        title="Controle interno declaratório — não comprova regularidade fiscal"
      >
        <p>{disclaimer}</p>
        <p className="mt-1">
          A emissão da guia, a confirmação de compensação bancária e a certidão de regularidade devem ser
          conferidas diretamente nos canais oficiais da Receita Federal.
        </p>
      </Notice>

      {(error || actionError) && <Notice tone="rose">{actionError || error}</Notice>}
      {feedback && <Notice tone="emerald">{feedback}</Notice>}
      {dirty && (
        <p className="text-sm text-amber-700">
          {Number(reminderChanged) + Number(receiptChanged)} alterações não salvas
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card as="section" data-tour="obligations-summary" className="space-y-4 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Resumo da agenda anual</h2>
              <p className="text-xs text-slate-500">
                12 competências mensais do DAS (vencimento dia 20) e 1 declaração anual DASN-SIMEI (31/05).
              </p>
            </div>
            <Field label="Ano da agenda" className="w-full sm:w-44">
              <Select
                aria-label="Ano da agenda"
                value={selectedYear}
                disabled={busy}
                onChange={(e) => changeYear(Number(e.target.value))}
              >
                {yearOptions.map((yr) => (
                  <option key={yr} value={yr}>
                    Agenda {yr}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card tone="muted" padding="sm" inset>
              <p className="text-xs font-medium text-slate-500">Total no ano</p>
              <p className="text-2xl font-bold text-slate-900">{schedule?.totalCount ?? 13}</p>
              <p className="text-xs text-slate-500">12 DAS + 1 DASN-SIMEI</p>
            </Card>
            <Card tone="emerald" padding="sm" inset>
              <p className="text-xs font-medium text-emerald-800">Com comprovante manual</p>
              <p className="text-2xl font-bold text-emerald-900">{schedule?.paidDeclaredCount ?? 0}</p>
              <p className="text-xs text-emerald-700">Declaradas pelo MEI</p>
            </Card>
            <Card tone="amber" padding="sm" inset>
              <p className="text-xs font-medium text-amber-800">Vencendo em breve</p>
              <p className="text-2xl font-bold text-amber-900">{schedule?.dueSoonCount ?? 0}</p>
              <p className="text-xs text-amber-700">
                Em até {schedule?.reminderDaysBefore ?? 5} dia(s)
              </p>
            </Card>
            <Card tone="rose" padding="sm" inset>
              <p className="text-xs font-medium text-rose-800">Em atraso no controle</p>
              <p className="text-2xl font-bold text-rose-900">{schedule?.overdueCount ?? 0}</p>
              <p className="text-xs text-rose-700">Sem comprovante anotado</p>
            </Card>
          </div>
        </Card>

        <Card
          as="form"
          data-tour="obligations-reminders"
          onSubmit={handleReminderSubmit}
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              Lembrete de vencimento
            </h2>
            {reminderChanged && <Badge tone="amber">Não salvo</Badge>}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Escolha com quantos dias de antecedência deseja destacar obrigações próximas do vencimento.
          </p>
          <Field
            label="Antecedência do alerta (dias)"
            hint="Padrão recomendado: 5 dias antes (mín. 1 e máx. 30 dias)."
          >
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              max="30"
              value={currentReminderValue}
              onChange={(e) => setReminderInput(e.target.value)}
            />
          </Field>
          <Button
            type="submit"
            fullWidth
            disabled={busy || !reminderChanged}
          >
            Salvar lembrete
          </Button>
        </Card>
      </div>

      <Card as="section" data-tour="obligations-links" className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Portais oficiais verificados (Gov.br / Receita Federal)</h2>
          <p className="text-xs text-slate-500">
            Acesse diretamente os endereços oficiais para emitir o DAS mensal, transmitir a DASN-SIMEI anual ou consultar pendências.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {officialLinks.map((link) => (
            <Card key={link.id} tone="muted" padding="sm" inset className="flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{link.label}</h3>
                  <Badge tone="sky">Oficial</Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{link.description}</p>
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline"
              >
                Acessar portal oficial
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </Card>
          ))}
        </div>
      </Card>

      <Card as="section" data-tour="obligations-list" className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SegmentedControl
            label="Filtrar por tipo de obrigação"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={setTypeFilter}
            size="sm"
          />
          <Field label="Filtrar por situação" className="w-full sm:w-64">
            <Select
              aria-label="Filtrar por situação"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {loading ? (
          <EmptyState loading title="Carregando agenda de obrigações MEI..." />
        ) : filteredObligations.length === 0 ? (
          <EmptyState
            Icon={CalendarCheck}
            title="Nenhuma obrigação encontrada para este filtro"
            description="Altere os filtros de tipo ou situação para visualizar todas as competências do ano."
          />
        ) : (
          <div className="space-y-3">
            {filteredObligations.map((item) => {
              const badge = getObligationBadgeMeta(item)
              const countdown = formatDueCountdown(item)
              const isEditingThis = receiptForm.obligationId === item.id
              const isPaidDeclared = item.status === 'PAID_DECLARED'

              return (
                <Card
                  key={item.id}
                  as="article"
                  tone={isPaidDeclared ? 'emerald' : item.overdue ? 'rose' : item.dueSoon ? 'amber' : 'white'}
                  padding="sm"
                  className="space-y-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        <Badge tone="indigo">
                          {item.obligationType === 'DASN_SIMEI_ANUAL' ? 'Declaração Anual' : 'Guia Mensal'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        Competência: <strong>{formatCompetencyLabel(item.competency, item.obligationType)}</strong> ·
                        Vencimento oficial: <strong>{formatDateBR(item.dueDate)}</strong>
                      </p>
                      {countdown && (
                        <p className="text-xs font-medium text-slate-700">{countdown}</p>
                      )}
                      {isPaidDeclared && item.manualReceiptCode && (
                        <div className="text-xs text-slate-700 space-y-0.5 pt-1">
                          <p>
                            Comprovante informado manualmente:{' '}
                            <strong className="font-mono">{item.manualReceiptCode}</strong>
                            {item.paidAt ? ` em ${formatDateBR(item.paidAt)}` : ''}
                          </p>
                          {item.notes && <p className="text-slate-600">Observação: {item.notes}</p>}
                          <p className="text-[11px] text-slate-500">
                            Origem: Declaração manual interna ({item.verificationSource || 'MANUAL_DECLARATION'}) — não substitui certidão oficial.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <a
                        href={item.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 underline"
                      >
                        {item.officialPortalLabel || 'Portal Oficial'}
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                      <Button
                        size="sm"
                        variant={isPaidDeclared ? 'secondary' : 'primary'}
                        Icon={FileCheck2}
                        onClick={() => openReceiptEditor(item)}
                      >
                        {isPaidDeclared ? 'Editar comprovante' : 'Informar comprovante'}
                      </Button>
                      {isPaidDeclared && (
                        <Button
                          size="sm"
                          variant="ghost"
                          Icon={RotateCcw}
                          onClick={() => setReopenTarget(item)}
                        >
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditingThis && (
                    <Card
                      as="form"
                      tone="white"
                      padding="sm"
                      inset
                      onSubmit={handleReceiptSubmit}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Registro manual de comprovante ({item.title})
                        </h4>
                        {receiptChanged && <Badge tone="amber">Não salvo</Badge>}
                      </div>
                      <Notice tone="sky" size="sm">
                        Anote o código de autenticação bancária ou número do recibo de entrega para encontrar o comprovante rapidamente. Esta anotação não quita débitos automaticamente na Receita Federal.
                      </Notice>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field
                          label="Código / identificação do comprovante"
                          error={receiptErrors.manualReceiptCode}
                        >
                          <Input
                            placeholder="Ex.: Autenticação bancária ou recibo DASN"
                            maxLength={120}
                            value={receiptForm.manualReceiptCode}
                            onChange={(e) =>
                              setReceiptForm({ ...receiptForm, manualReceiptCode: e.target.value })
                            }
                          />
                        </Field>
                        <Field
                          label="Data do pagamento ou entrega"
                          error={receiptErrors.paidAt}
                        >
                          <Input
                            type="date"
                            max={todayISO()}
                            value={receiptForm.paidAt}
                            onChange={(e) =>
                              setReceiptForm({ ...receiptForm, paidAt: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Observações internas (opcional)">
                        <Input
                          placeholder="Ex.: Comprovante salvo na pasta do banco PJ"
                          maxLength={500}
                          value={receiptForm.notes}
                          onChange={(e) =>
                            setReceiptForm({ ...receiptForm, notes: e.target.value })
                          }
                        />
                      </Field>
                      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={closeReceiptEditor}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={busy}
                        >
                          Salvar comprovante manual
                        </Button>
                      </div>
                    </Card>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={reopenTarget !== null}
        title="Reabrir obrigação no controle interno?"
        message={`O comprovante manual anotado em "${reopenTarget?.title || ''}" será removido e a obrigação voltará a ficar em aberto neste painel.`}
        confirmLabel="Remover comprovante e reabrir"
        cancelLabel="Manter comprovante"
        onConfirm={confirmReopen}
        onCancel={() => setReopenTarget(null)}
      />
    </div>
  )
}
