import useDraft from '../hooks/useDraft'
import { useState, useEffect, useRef } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  RefreshCw,
  Wallet,
  CalendarDays,
  Repeat,
  Search,
  Package
} from 'lucide-react'
import { formatCurrencyBRL } from '../utils/formatters'
import { costCategoryLabel } from '../constants/costCategories'
import CostForm from './CostForm'
import ConfirmDialog from './ConfirmDialog'
import { Badge, Button, Card, EmptyState, IconButton, Input, Notice, Select } from './ui'

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

export default function CostManager({
  kind,
  service,
  categories,
  products = [],
  initialDraft = null,
  onInitialDraftConsumed
}) {
  const { guard } = useDraft(null)
  const meta = KIND_META[kind]
  const amountKey = meta.amountKey
  const isVariable = kind === 'variable'

  const [costs, setCosts] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [referenceMonth, setReferenceMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formVersion, setFormVersion] = useState(0)
  const [showForm, setShowForm] = useState(Boolean(initialDraft))
  const [editingCost, setEditingCost] = useState(initialDraft)
  const formRef = useRef(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm, editingCost])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (initialDraft) onInitialDraftConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadCosts = async () => {
      try {
        const params = { page: 0, size: PAGE_SIZE }
        if (selectedCategory) params.category = selectedCategory
        if (selectedProduct) params.productId = selectedProduct
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
  }, [reloadKey, selectedCategory, selectedProduct, referenceMonth])

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

  const handleProductChange = (value) => {
    setLoading(true)
    setSelectedProduct(value)
  }

  const handleNew = () => {
    setFormVersion(version => version + 1)
    setEditingCost(null)
    setShowForm(true)
  }

  const handleEdit = (cost) => {
    setFormVersion(version => version + 1)
    setEditingCost(cost)
    setShowForm(true)
  }

  const handleDelete = async () => {
    const cost = pendingDelete
    setPendingDelete(null)
    setDeleteError(null)
    setSaving(true)
    try {
      await service.remove(cost.id)
      reload()
    } catch {
      setDeleteError('Não foi possível excluir o custo. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingCost(null)
    reload()
  }

  const hasFilters = Boolean(selectedCategory || selectedProduct || referenceMonth)
  const clearFilters = () => {
    if (!hasFilters) return
    setLoading(true)
    setSelectedCategory('')
    setSelectedProduct('')
    setReferenceMonth('')
  }

  const monthlyFixedTotal = costs
    .filter((cost) => cost.recurring)
    .reduce((acc, cost) => acc + (Number(cost[amountKey]) || 0), 0)

  const renderSummary = () => {
    if (kind === 'fixed') {
      return (
        <Card tone="emerald" inset padding="sm">
          <p className="text-xs font-medium text-emerald-700 mb-1 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" />
            Total mensal dos custos recorrentes exibidos
          </p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrencyBRL(monthlyFixedTotal)}</p>
        </Card>
      )
    }
    const totalExibido = costs.reduce((acc, cost) => acc + (Number(cost[amountKey]) || 0), 0)
    return (
      <Card tone="emerald" inset padding="sm">
        <p className="text-xs font-medium text-emerald-700 mb-1">Total exibido</p>
        <p className="text-lg font-bold text-emerald-700">{formatCurrencyBRL(totalExibido)}</p>
      </Card>
    )
  }

  const formSection = showForm ? (
    <div className="w-full mb-6" ref={formRef}>
      <CostForm
        key={formVersion}
        kind={kind}
        service={service}
        categories={categories}
        products={products}
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
    <Card padding="none" className="w-full overflow-hidden">
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
        <Button Icon={Plus} onClick={() => guard(handleNew)}>
          Novo custo
        </Button>
      </div>

      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <Select
            Icon={Search}
            className="sm:max-w-xs"
            aria-label="Filtrar por padrão de precificação"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Todos os padrões de precificação</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>

          {meta.supportMonth && (
            <Input
              type="month"
              Icon={CalendarDays}
              className="sm:max-w-[150px]"
              aria-label="Filtrar por mês"
              value={referenceMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              placeholder="AAAA-MM"
            />
          )}

          {isVariable && (
            <Select
              Icon={Package}
              className="sm:max-w-[220px]"
              aria-label="Filtrar por produto"
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
            >
              <option value="">Todos os produtos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" Icon={RefreshCw} loading={loading} onClick={reload}>
            Atualizar
          </Button>
          <Button variant="secondary" size="sm" disabled={!hasFilters} onClick={clearFilters}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      {deleteError && <Notice tone="rose" size="sm" className="m-5">{deleteError}</Notice>}

      {loading ? (
        <EmptyState loading title="Carregando custos..." />
      ) : error ? (
        <EmptyState
          tone="rose"
          Icon={AlertCircle}
          title={error}
          action={<Button onClick={reload}>Tentar novamente</Button>}
        />
      ) : costs.length === 0 ? (
        <EmptyState
          Icon={Wallet}
          title={hasFilters ? 'Nenhum custo para os filtros selecionados' : meta.emptyMessage}
          description={hasFilters
            ? 'Limpe os filtros para consultar os demais custos cadastrados.'
            : isVariable
              ? 'Cadastre os custos por produto ou serviço para compor seus preços de venda.'
              : 'Cadastre as despesas do negócio para acompanhar seu resultado no fluxo de caixa.'}
          action={hasFilters
            ? <Button size="sm" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
            : <Button size="sm" Icon={Plus} onClick={() => guard(handleNew)}>
              {isVariable ? 'Cadastrar primeiro custo variável' : 'Cadastrar primeiro custo fixo'}
            </Button>}
        />
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
                    <Badge tone={cost.recurring ? 'emerald' : 'amber'} Icon={Repeat}>
                      {cost.recurring ? 'Mensal' : 'Eventual'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {costCategoryLabel(categories, cost.category)}
                  {isVariable && cost.productName ? ` • ${cost.productName}` : ''}
                  {cost.dueDate ? ` • vence ${formatDate(cost.dueDate)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <p className="font-bold text-slate-900 text-sm whitespace-nowrap">
                  {formatCurrencyBRL(cost[amountKey])}
                </p>
                <div className="flex items-center gap-1">
                  <IconButton
                    label={`Editar ${cost.name}`}
                    title="Editar"
                    Icon={Pencil}
                    tone="indigo"
                    size="md"
                    onClick={() => guard(() => handleEdit(cost))}
                  />
                  <IconButton
                    label={`Excluir ${cost.name}`}
                    title="Excluir"
                    Icon={Trash2}
                    tone="rose"
                    size="md"
                    onClick={() => setPendingDelete(cost)}
                    disabled={saving}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="p-5 border-t border-slate-100">{renderSummary()}</div>
    </Card>
  )

  return (
    <div className="w-full">
      {formSection}
      {listSection}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir custo?"
        message={`"${pendingDelete?.name}" será desativado e preservado no histórico.`}
        confirmLabel="Excluir custo"
        cancelLabel="Manter custo"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

const formatDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}
