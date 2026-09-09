import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Receipt,
  Wallet,
  CalendarDays,
  Repeat,
  Search
} from 'lucide-react'
import { formatCurrencyBRL } from '../utils/formatters'
import { costCategoryLabel } from '../constants/costCategories'
import CostForm from './CostForm'

const KIND_META = {
  fixed: {
    title: 'Custos Fixos',
    subtitle: 'Despesas recorrentes do seu negócio (aluguel, DAS MEI, energia, internet...)',
    amountKey: 'amount',
    emptyMessage: 'Nenhum custo fixo cadastrado ainda.',
    supportMonth: true
  },
  variable: {
    title: 'Custos Variáveis',
    subtitle: 'Custos que variam por produto ou serviço (matéria-prima, embalagem, frete...)',
    amountKey: 'unitAmount',
    emptyMessage: 'Nenhum custo variável cadastrado ainda.',
    supportMonth: false
  }
}

const PAGE_SIZE = 50

export default function CostManager({ kind, service, categories }) {
  const meta = KIND_META[kind]
  const amountKey = meta.amountKey

  const [costs, setCosts] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [referenceMonth, setReferenceMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCost, setEditingCost] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadCosts = async () => {
      try {
        const params = { page: 0, size: PAGE_SIZE }
        if (selectedCategory) params.category = selectedCategory
        if (meta.supportMonth && referenceMonth) params.month = referenceMonth
        const data = await service.list(params)
        if (cancelled) return
        setCosts(data.content || [])
        setTotalElements(data.totalElements || 0)
        setError(null)
      } catch {
        if (!cancelled) setError('Não foi possível carregar os custos. Tente novamente.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCosts()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, selectedCategory, referenceMonth])

  const reload = () => {
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  const handleCategoryChange = (value) => {
    setLoading(true)
    setSelectedCategory(value)
  }

  const handleMonthChange = (value) => {
    setLoading(true)
    setReferenceMonth(value)
  }

  const handleNew = () => {
    setEditingCost(null)
    setShowForm(true)
  }

  const handleEdit = (cost) => {
    setEditingCost(cost)
    setShowForm(true)
  }

  const handleDelete = async (cost) => {
    const confirmed = window.confirm(
      `Excluir "${cost.name}"? O registro será desativado e preservado no histórico.`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      await service.remove(cost.id)
      reload()
    } catch {
      window.alert('Não foi possível excluir o custo. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingCost(null)
    reload()
  }

  const monthlyFixedTotal = costs
    .filter((cost) => cost.recurring)
    .reduce((acc, cost) => acc + (Number(cost[amountKey]) || 0), 0)

  const renderSummary = () => {
    if (kind === 'fixed') {
      return (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
          <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" />
            Total mensal dos custos recorrentes exibidos
          </p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrencyBRL(monthlyFixedTotal)}</p>
        </div>
      )
    }
    const totalExibido = costs.reduce((acc, cost) => acc + (Number(cost[amountKey]) || 0), 0)
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
        <p className="text-xs font-medium text-emerald-700 mb-1">Total exibido</p>
        <p className="text-lg font-bold text-emerald-700">{formatCurrencyBRL(totalExibido)}</p>
      </div>
    )
  }

  const formSection = showForm ? (
    <div className="w-full mb-6">
      <CostForm
        kind={kind}
        service={service}
        categories={categories}
        initialCost={editingCost}
        onCancel={() => {
          setShowForm(false)
          setEditingCost(null)
        }}
        onSaved={handleSaved}
      />
    </div>
  ) : null

  const listSection = (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{meta.title}</h2>
              <p className="text-xs text-slate-500">
                {totalElements} {totalElements === 1 ? 'registro' : 'registros'}
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNew}
          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo custo
        </button>
      </div>

      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="relative sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 appearance-none"
            >
              <option value="">Todas as categorias</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {meta.supportMonth && (
            <div className="relative sm:max-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <CalendarDays className="w-4 h-4" />
              </div>
              <input
                type="month"
                value={referenceMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                placeholder="AAAA-MM"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => {
              handleCategoryChange('')
              handleMonthChange('')
            }}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all cursor-pointer"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carregando custos...</p>
        </div>
      ) : error ? (
        <div className="p-10 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <p className="text-sm text-rose-600 font-medium mb-4">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : costs.length === 0 ? (
        <div className="p-10 text-center">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{meta.emptyMessage}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {costs.map((cost) => (
            <li
              key={cost.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm truncate">{cost.name}</p>
                  {kind === 'fixed' && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        cost.recurring
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <Repeat className="w-3 h-3" />
                      {cost.recurring ? 'Mensal' : 'Eventual'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {costCategoryLabel(categories, cost.category)}
                  {cost.dueDate ? ` • vence ${formatDate(cost.dueDate)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <p className="font-bold text-slate-900 text-sm whitespace-nowrap">
                  {formatCurrencyBRL(cost[amountKey])}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEdit(cost)}
                    title="Editar"
                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cost)}
                    disabled={saving}
                    title="Excluir"
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="p-5 border-t border-slate-100">{renderSummary()}</div>
    </div>
  )

  return (
    <div className="w-full max-w-3xl mx-auto">
      {formSection}
      {listSection}
    </div>
  )
}

const formatDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}
