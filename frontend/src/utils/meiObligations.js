const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

export const PGMEI_OFFICIAL_URL =
  'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao'
export const DASN_SIMEI_OFFICIAL_URL =
  'https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao'
export const PORTAL_EMPREENDEDOR_OFFICIAL_URL =
  'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor'

export const OFFICIAL_MEI_LINKS = [
  {
    id: 'pgmei',
    label: 'PGMEI — Emissão do DAS',
    description:
      'Programa Gerador de Documento de Arrecadação do Simples Nacional para o MEI (Receita Federal).',
    url: PGMEI_OFFICIAL_URL,
    verified: true
  },
  {
    id: 'dasn-simei',
    label: 'DASN-SIMEI — Declaração Anual',
    description:
      'Declaração Anual Simplificada para o Microempreendedor Individual referente ao ano-calendário anterior.',
    url: DASN_SIMEI_OFFICIAL_URL,
    verified: true
  },
  {
    id: 'portal-empreendedor',
    label: 'Portal do Empreendedor (Gov.br)',
    description:
      'Canal oficial do Governo Federal com orientações, serviços e consulta de obrigações do MEI.',
    url: PORTAL_EMPREENDEDOR_OFFICIAL_URL,
    verified: true
  }
]

export const REGULARITY_DISCLAIMER =
  'O registro neste painel é apenas um controle interno declaratório do MEI e não comprova nem atesta regularidade fiscal perante a Receita Federal.'

export function formatCompetencyLabel(competency, obligationType) {
  if (obligationType === 'DASN_SIMEI_ANUAL') {
    return `Ano-calendário ${competency || '—'}`
  }
  const match = /^(\d{4})-(\d{2})$/.exec(competency || '')
  if (!match) return competency || '—'
  const year = match[1]
  const monthIndex = Number(match[2]) - 1
  if (monthIndex < 0 || monthIndex > 11) return competency
  return `${MONTH_NAMES[monthIndex]}/${year}`
}

export function getObligationBadgeMeta(obligation) {
  if (!obligation) {
    return { label: 'Pendente', tone: 'slate' }
  }
  if (obligation.status === 'PAID_DECLARED') {
    return { label: 'Comprovante manual', tone: 'emerald' }
  }
  if (obligation.overdue || obligation.status === 'OVERDUE') {
    return { label: 'Em atraso no controle', tone: 'rose' }
  }
  if (obligation.dueSoon) {
    return { label: 'Vence em breve', tone: 'amber' }
  }
  return { label: 'Pendente', tone: 'slate' }
}

export function formatDueCountdown(obligation) {
  if (!obligation) return ''
  if (obligation.status === 'PAID_DECLARED') {
    return 'Comprovante informado manualmente pelo MEI'
  }
  const days = Number(obligation.daysUntilDue)
  if (!Number.isFinite(days)) return ''
  if (days < 0) {
    const overdueDays = Math.abs(days)
    return overdueDays === 1 ? 'Vencida há 1 dia' : `Vencida há ${overdueDays} dias`
  }
  if (days === 0) {
    return 'Vence hoje'
  }
  return days === 1 ? 'Vence em 1 dia' : `Vence em ${days} dias`
}

export function filterObligations(obligations = [], { typeFilter = 'ALL', statusFilter = 'ALL' } = {}) {
  return obligations.filter((item) => {
    if (typeFilter !== 'ALL' && item.obligationType !== typeFilter) {
      return false
    }
    if (statusFilter === 'PAID_DECLARED') {
      return item.status === 'PAID_DECLARED'
    }
    if (statusFilter === 'OVERDUE') {
      return Boolean(item.overdue || item.status === 'OVERDUE')
    }
    if (statusFilter === 'DUE_SOON') {
      return Boolean(item.dueSoon && item.status !== 'PAID_DECLARED')
    }
    if (statusFilter === 'PENDING') {
      return item.status !== 'PAID_DECLARED'
    }
    return true
  })
}

export function validateManualReceipt({ manualReceiptCode = '', paidAt = '', today = '' } = {}) {
  const errors = {}
  const trimmedReceipt = String(manualReceiptCode || '').trim()

  if (!trimmedReceipt) {
    errors.manualReceiptCode =
      'Informe o número do documento, código de autenticação bancária ou recibo de entrega.'
  } else if (trimmedReceipt.length > 120) {
    errors.manualReceiptCode = 'A identificação do comprovante deve ter no máximo 120 caracteres.'
  }

  if (paidAt && today && paidAt > today) {
    errors.paidAt = 'A data do comprovante não pode ser futura.'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
