import useDraft from '../hooks/useDraft'
import { useState } from 'react'
import {
  ShoppingBag,
  TrendingUp,
  CreditCard,
  DollarSign,
  Percent,
  Trash2,
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertCircle
} from 'lucide-react'
import useSales from '../hooks/useSales'
import SalesForm from './SalesForm'
import PageHeader from './PageHeader'
import { Badge, Button, Card, EmptyState, IconButton, Notice, SegmentedControl } from './ui'
import { formatCurrencyBRL } from '../utils/formatters'
import { PAYMENT_METHODS } from '../constants/sales'

export default function SalesManager({ onNavigate, draft, onDraftChange, onBusyChange }) {
  const [formBusy, setFormBusy] = useState(false)
  const handleBusyChange = (busy) => { setFormBusy(busy); onBusyChange?.(busy) }
  const { guard } = useDraft(null)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [showQuickForm, setShowQuickForm] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const {
    salesData,
    loading,
    error,
    operationError,
    setFilters,
    recordSale,
    removeSale
  } = useSales()

  const handleFilterMethod = (methodKey) => {
    setSelectedMethod(methodKey)
    setFilters((prev) => {
      const next = { ...prev, page: 0 }
      if (methodKey) {
        next.paymentMethod = methodKey
      } else {
        delete next.paymentMethod
      }
      return next
    })
  }

  const openQuickForm = () => {
    setShowQuickForm(true)
    requestAnimationFrame(() => {
      const form = document.getElementById('sale-form')
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      form?.querySelector('input, select')?.focus({ preventScroll: true })
    })
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await removeSale(id)
      setConfirmDeleteId(null)
    } catch {
      // Erro gerenciado no hook
    } finally {
      setDeletingId(null)
    }
  }

  const salesList = salesData?.sales?.content || []
  const totalCount = salesData?.totalSalesCount || 0
  const totalGross = salesData?.totalGrossRevenue || 0
  const totalFees = salesData?.totalFeeAmount || 0
  const totalNet = salesData?.totalNetRevenue || 0

  const formatDate = (isoString) => {
    if (!isoString) return '—'
    const date = new Date(isoString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={ShoppingBag}
        title="Registro de Vendas"
        description="Lance vendas com agilidade e acompanhe seu faturamento bruto, taxas e lucro líquido real."
      >
        <Button
          disabled={formBusy}
          data-tour="sales-new"
          Icon={showQuickForm ? ChevronUp : Plus}
          onClick={() => guard(() => setShowQuickForm(!showQuickForm))}
        >
          {showQuickForm ? 'Ocultar Formulário' : 'Nova Venda Rápida'}
        </Button>
      </PageHeader>

      {operationError && <Notice tone="rose" size="sm">{operationError}</Notice>}
      <div data-tour="sales-metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento Bruto</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{formatCurrencyBRL(totalGross)}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxas Retidas</span>
            <p className="text-xl font-extrabold text-rose-600 mt-0.5">− {formatCurrencyBRL(totalFees)}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Líquido em Caixa</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{formatCurrencyBRL(totalNet)}</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas Realizadas</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalCount}</p>
          </div>
        </Card>
      </div>

      {showQuickForm && (
        <div data-tour="sales-form" className="transition-all duration-300">
          <SalesForm onSaleCreated={recordSale} onNavigate={onNavigate} draft={draft} onDraftChange={onDraftChange} onBusyChange={handleBusyChange} />
        </div>
      )}

      <Card padding="none" className="overflow-hidden">
        <div data-tour="sales-filters" className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar por Pagamento:</span>
          </div>

          <SegmentedControl
            label="Filtrar por forma de pagamento"
            options={[{ value: '', label: 'Todos' }, ...PAYMENT_METHODS.map((m) => ({ value: m.key, label: m.label }))]}
            value={selectedMethod}
            onChange={handleFilterMethod}
          />
        </div>

        {loading ? (
          <EmptyState loading title="Carregando histórico de vendas..." />
        ) : error ? (
          <EmptyState tone="rose" Icon={AlertCircle} title={error} />
        ) : salesList.length === 0 ? (
          <EmptyState
            Icon={ShoppingBag}
            title={selectedMethod ? 'Nenhuma venda com este pagamento' : 'Nenhuma venda registrada'}
            description={selectedMethod
              ? 'Escolha outro pagamento ou limpe o filtro para ver as demais vendas.'
              : 'Registre sua primeira venda para acompanhar entradas e taxas de pagamento.'}
            action={selectedMethod
              ? <Button size="sm" variant="secondary" onClick={() => handleFilterMethod('')}>Limpar filtro</Button>
              : <Button size="sm" Icon={Plus} onClick={openQuickForm}>Registrar primeira venda</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Item / Produto</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Valor Bruto</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-right">Taxa (-%)</th>
                  <th className="py-3 px-4 text-right">Líquido no Caixa</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesList.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(sale.soldAt)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>
                        <span>{sale.description}</span>
                        {sale.productName && sale.description !== sale.productName && (
                          <span className="block text-[11px] text-slate-400 font-normal">
                            Catálogo: {sale.productName}
                          </span>
                        )}
                        {sale.notes && (
                          <span className="block text-[10px] text-slate-500 italic mt-0.5">
                            Obs: {sale.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-slate-700">
                      {sale.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                      {formatCurrencyBRL(sale.grossAmount)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge tone="indigo">
                        {sale.paymentMethodDescription || sale.paymentMethod}
                        {sale.installments > 1 && ` (${sale.installments}x)`}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-rose-600 font-medium">
                      − {formatCurrencyBRL(sale.feeAmount)}
                      <span className="block text-[10px] text-slate-400">({sale.feePercentage}%)</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                      {formatCurrencyBRL(sale.netAmount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {confirmDeleteId === sale.id ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={deletingId === sale.id}
                            onClick={() => handleDelete(sale.id)}
                          >
                            {deletingId === sale.id ? '...' : 'Sim'}
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => setConfirmDeleteId(null)}>
                            Não
                          </Button>
                        </div>
                      ) : (
                        <IconButton
                          label={`Excluir venda ${sale.description}`}
                          title="Excluir venda"
                          Icon={Trash2}
                          tone="rose"
                          onClick={() => setConfirmDeleteId(sale.id)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
