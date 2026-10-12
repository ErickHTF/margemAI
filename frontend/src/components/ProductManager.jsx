import EmptyState, { EmptyStateAction } from './EmptyState'
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
  Loader2,
  TrendingUp,
  Percent,
  DollarSign,
  Layers
} from 'lucide-react'
import { productService } from '../services/productService'
import { formatCurrencyBRL } from '../utils/formatters'
import ProductForm from './ProductForm'

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

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Excluir "${product.name}"? O item será desativado do catálogo.`
    )
    if (!confirmed) return

    setSaving(true)
    try {
      await productService.deleteProduct(product.id)
      reload()
    } catch {
      window.alert('Não foi possível excluir o item. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingProduct(null)
    reload()
  }

  const getMarginBadgeClass = (percentage) => {
    const p = Number(percentage) || 0
    if (p >= 30) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (p >= 15) return 'bg-teal-50 text-teal-700 border-teal-200'
    if (p >= 0) return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  const totalProducts = products.filter((p) => p.type === 'PRODUTO').length
  const totalServices = products.filter((p) => p.type === 'SERVICO').length

  return (
    <div className="w-full space-y-6">
      <PageHeader Icon={Package} title="Catálogo de Produtos e Serviços" description="Gerencie os itens, custos e preços do seu negócio.">
          <button
            type="button"
            data-tour="products-new"
            onClick={() => guard(handleNew)}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Item
          </button>
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

      <div data-tour="products-list" className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setLoading(true); setSearchTerm(e.target.value) }}
                data-tour="products-search"
                placeholder="Buscar por nome do produto ou serviço..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>

            <div className="flex rounded-xl bg-slate-200/70 p-1 self-start">
              <button
                type="button"
                onClick={() => { if (selectedType !== '') setLoading(true); setSelectedType('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedType === ''
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({totalElements})
              </button>
              <button
                type="button"
                onClick={() => { if (selectedType !== 'PRODUTO') setLoading(true); setSelectedType('PRODUTO') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedType === 'PRODUTO'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Produtos
              </button>
              <button
                type="button"
                onClick={() => { if (selectedType !== 'SERVICO') setLoading(true); setSelectedType('SERVICO') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedType === 'SERVICO'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Serviços
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-medium transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Carregando catálogo...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
            <p className="text-sm text-rose-600 font-medium mb-4">{error}</p>
            <button
              type="button"
              onClick={reload}
              className="py-2 px-4 rounded-xl bg-indigo-600 text-white text-sm font-medium"
            >
              Tentar novamente
            </button>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            Icon={Package}
            title={selectedType || searchTerm.trim() ? 'Nenhum resultado para os filtros selecionados' : 'Nenhum item cadastrado'}
            description={selectedType || searchTerm.trim()
              ? 'Altere a busca ou limpe os filtros para ver os registros disponíveis.'
              : 'Cadastre produtos e serviços para reutilizá-los nas vendas e acompanhar seus custos e margens.'}
          >
            {selectedType || searchTerm.trim() ? (
              <EmptyStateAction onClick={() => {
                setLoading(true)
                setSelectedType('')
                setSearchTerm('')
              }}>Limpar filtros</EmptyStateAction>
            ) : (
              <EmptyStateAction onClick={() => guard(handleNew)}>Cadastrar primeiro item</EmptyStateAction>
            )}
          </EmptyState>
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
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {item.type === 'SERVICO' ? 'Serviço' : 'Produto'}
                      </span>
                      {item.categoryName && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">
                          {item.categoryName}
                        </span>
                      )}
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

                  <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getMarginBadgeClass(item.marginPercentage)}`}>
                    {item.marginPercentage}%
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => guard(() => handleEdit(item))}
                      title="Editar"
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      disabled={saving}
                      title="Excluir"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
      </div>
    </div>
  )
}
