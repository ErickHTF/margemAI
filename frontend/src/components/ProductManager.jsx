import useDraft from '../hooks/useDraft'
import PageHeader from './PageHeader'
import { useState, useEffect, useRef } from 'react'
import {
  Package,
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Percent,
  DollarSign,
  Layers
} from 'lucide-react'
import { productService } from '../services/productService'
import { formatCurrencyBRL } from '../utils/formatters'
import ProductForm from './ProductForm'
import ConfirmDialog from './ConfirmDialog'
import { Badge, Button, Card, EmptyState, IconButton, Input, Notice, SegmentedControl } from './ui'

const PAGE_SIZE = 50

export default function ProductManager() {
  const { guard } = useDraft(null)
  const [products, setProducts] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [selectedType, setSelectedType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formVersion, setFormVersion] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const formRef = useRef(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm, editingProduct])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const params = { page: 0, size: PAGE_SIZE }
        if (selectedType) params.type = selectedType
        if (searchTerm.trim()) params.name = searchTerm.trim()
        const data = await productService.getProducts(params)
        if (cancelled) return
        setProducts(data.content || [])
        setTotalElements(data.totalElements || 0)
        setError(null)
      } catch {
        if (!cancelled) setError('Não foi possível carregar o catálogo de produtos e serviços.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [reloadKey, selectedType, searchTerm])

  const reload = () => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  const hasFilters = Boolean(selectedType || searchTerm.trim())
  const clearFilters = () => {
    setLoading(true)
    setSelectedType('')
    setSearchTerm('')
  }

  const handleNew = () => {
    setFormVersion(version => version + 1)
    setEditingProduct(null)
    setShowForm(true)
  }

  const handleEdit = (product) => {
    setFormVersion(version => version + 1)
    setEditingProduct(product)
    setShowForm(true)
  }

  const handleDelete = async () => {
    const product = pendingDelete
    setPendingDelete(null)
    setDeleteError(null)
    setSaving(true)
    try {
      await productService.deleteProduct(product.id)
      reload()
    } catch {
      setDeleteError('Não foi possível excluir o item. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingProduct(null)
    reload()
  }

  const getMarginTone = (percentage) => {
    const p = Number(percentage) || 0
    if (p >= 30) return 'emerald'
    if (p >= 15) return 'sky'
    if (p >= 0) return 'amber'
    return 'rose'
  }

  const totalProducts = products.filter((p) => p.type === 'PRODUTO').length
  const totalServices = products.filter((p) => p.type === 'SERVICO').length

  return (
    <div className="w-full space-y-6">
      <PageHeader Icon={Package} title="Catálogo de Produtos e Serviços" description="Gerencie os itens, custos e preços do seu negócio.">
        <Button data-tour="products-new" Icon={Plus} onClick={() => guard(handleNew)}>
          Novo Item
        </Button>
      </PageHeader>
      {showForm && (
        <div ref={formRef}>
          <ProductForm
            key={formVersion}
            initialProduct={editingProduct}
            onCancel={() => {
              setShowForm(false)
              setEditingProduct(null)
            }}
            onSaved={handleSaved}
          />
        </div>
      )}

      <Card padding="none" data-tour="products-list" className="overflow-hidden">
        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <Input
              type="text"
              Icon={Search}
              className="flex-1"
              aria-label="Buscar item do catálogo"
              value={searchTerm}
              onChange={(e) => { setLoading(true); setSearchTerm(e.target.value) }}
              data-tour="products-search"
              placeholder="Buscar por nome do produto ou serviço..."
            />

            <SegmentedControl
              label="Filtrar por tipo"
              className="self-start"
              options={[
                { value: '', label: `Todos (${totalElements})` },
                { value: 'PRODUTO', label: 'Produtos' },
                { value: 'SERVICO', label: 'Serviços' }
              ]}
              value={selectedType}
              onChange={(value) => {
                if (selectedType !== value) setLoading(true)
                setSelectedType(value)
              }}
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button variant="secondary" size="sm" Icon={RefreshCw} loading={loading} onClick={reload}>
              Atualizar
            </Button>
          </div>
        </div>

        {deleteError && <Notice tone="rose" size="sm" className="m-5">{deleteError}</Notice>}

        {loading ? (
          <EmptyState loading title="Carregando catálogo..." />
        ) : error ? (
          <EmptyState
            tone="rose"
            Icon={AlertCircle}
            title={error}
            action={<Button onClick={reload}>Tentar novamente</Button>}
          />
        ) : products.length === 0 ? (
          <EmptyState
            Icon={Package}
            title={hasFilters ? 'Nenhum resultado para os filtros selecionados' : 'Nenhum item cadastrado'}
            description={hasFilters
              ? 'Altere a busca ou limpe os filtros para ver os registros disponíveis.'
              : 'Cadastre produtos e serviços para reutilizá-los nas vendas e acompanhar seus custos e margens.'}
            action={hasFilters
              ? <Button size="sm" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
              : <Button size="sm" Icon={Plus} onClick={() => guard(handleNew)}>Cadastrar primeiro item</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    {item.type === 'SERVICO' ? (
                      <Wrench className="w-5 h-5 text-teal-600" />
                    ) : (
                      <Package className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                      <Badge>{item.type === 'SERVICO' ? 'Serviço' : 'Produto'}</Badge>
                      {item.categoryName && <Badge tone="indigo">{item.categoryName}</Badge>}
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                      <span>
                        Custo Base:{' '}
                        <strong className="text-slate-800 font-semibold">
                          {formatCurrencyBRL(item.effectiveBaseCost)}
                        </strong>
                        {Number(item.variableCostsTotal) > 0 && (
                          <span className="text-[10px] text-teal-600 font-normal ml-1">
                            (dinâmico via {formatCurrencyBRL(item.variableCostsTotal)} em variáveis)
                          </span>
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        Margem Unitária:{' '}
                        <strong className="text-slate-800 font-semibold">
                          {formatCurrencyBRL(item.contributionMargin)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                      Preço de Venda
                    </span>
                    <span className="text-base font-extrabold text-slate-900">
                      {formatCurrencyBRL(item.sellingPrice)}
                    </span>
                  </div>

                  <Badge tone={getMarginTone(item.marginPercentage)}>{item.marginPercentage}%</Badge>

                  <div className="flex items-center gap-1">
                    <IconButton
                      label={`Editar ${item.name}`}
                      title="Editar"
                      Icon={Pencil}
                      tone="indigo"
                      size="md"
                      onClick={() => guard(() => handleEdit(item))}
                    />
                    <IconButton
                      label={`Excluir ${item.name}`}
                      title="Excluir"
                      Icon={Trash2}
                      tone="rose"
                      size="md"
                      onClick={() => setPendingDelete(item)}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total: <strong>{totalElements}</strong> itens cadastrados ({totalProducts} produtos, {totalServices} serviços)
          </span>
          <span className="text-[11px] text-slate-400">
            Margem calculada: (Preço Venda - Custo Base) / Preço Venda
          </span>
        </div>
      </Card>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Excluir item do catálogo?"
        message={`"${pendingDelete?.name}" será desativado do catálogo.`}
        confirmLabel="Excluir item"
        cancelLabel="Manter item"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
