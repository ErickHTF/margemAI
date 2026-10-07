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
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react'
import useSales from '../hooks/useSales'
import SalesForm from './SalesForm'
import PageHeader from './PageHeader'
import { formatCurrencyBRL } from '../utils/formatters'
import { PAYMENT_METHODS } from '../constants/sales'

export default function SalesManager({ onNavigate }) {
  const [selectedMethod, setSelectedMethod] = useState('')
  const [showQuickForm, setShowQuickForm] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const {
    salesData,
    loading,
    error,
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
    <div className="space-y-6">
      {/* Cabeçalho */}
      <PageHeader
        Icon={ShoppingBag}
        title="Registro de Vendas"
        description="Lance vendas com agilidade e acompanhe seu faturamento bruto, taxas e lucro líquido real."
      >
        <button
          type="button"
          onClick={() => setShowQuickForm(!showQuickForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          {showQuickForm ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Ocultar Formulário
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Nova Venda Rápida
            </>
          )}
        </button>
      </PageHeader>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturamento Bruto</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{formatCurrencyBRL(totalGross)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taxas Retidas</span>
            <p className="text-xl font-extrabold text-rose-600 mt-0.5">− {formatCurrencyBRL(totalFees)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Líquido em Caixa</span>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{formatCurrencyBRL(totalNet)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas Realizadas</span>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalCount}</p>
          </div>
        </div>
      </div>

      {/* Formulário de Registro Rápido */}
      {showQuickForm && (
        <div className="transition-all duration-300">
          <SalesForm onSaleCreated={recordSale} onNavigate={onNavigate} />
        </div>
      )}

      {/* Histórico de Vendas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Filtrar por Pagamento:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleFilterMethod('')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedMethod === ''
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            {PAYMENT_METHODS.map((m) => (
              <button
                type="button"
                key={m.key}
                onClick={() => handleFilterMethod(m.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedMethod === m.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabela de Vendas */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <span className="text-sm font-medium">Carregando histórico de vendas...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        ) : salesList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhuma venda registrada</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Lance sua primeira venda no formulário acima para começar a controlar suas entradas e taxas da maquineta.
            </p>
          </div>
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {sale.paymentMethodDescription || sale.paymentMethod}
                        {sale.installments > 1 && ` (${sale.installments}x)`}
                      </span>
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
                          <button
                            type="button"
                            disabled={deletingId === sale.id}
                            onClick={() => handleDelete(sale.id)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition"
                          >
                            {deletingId === sale.id ? '...' : 'Sim'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium transition"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(sale.id)}
                          title="Excluir venda"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
