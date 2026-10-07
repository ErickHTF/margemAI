import { useState, useEffect, useRef } from 'react'
import {
  Tags,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  AlertCircle,
  Loader2,
  Power
} from 'lucide-react'
import { categoryService } from '../services/categoryService'
import CategoryForm from './CategoryForm'

const PAGE_SIZE = 50

export default function CategoryManager() {
  const [categories, setCategories] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [selectedType, setSelectedType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const formRef = useRef(null)

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [showForm, editingCategory])

  useEffect(() => {
    let cancelled = false

    const loadCategories = async () => {
      try {
        const params = { page: 0, size: PAGE_SIZE }
        if (selectedType) params.type = selectedType
        if (searchTerm.trim()) params.search = searchTerm.trim()
        const data = await categoryService.getCategories(params)
        if (cancelled) return
        setCategories(data.content || [])
        setTotalElements(data.totalElements || 0)
        setError(null)
      } catch {
        if (!cancelled) setError('Não foi possível carregar os padrões de preço.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCategories()
    return () => {
      cancelled = true
    }
  }, [reloadKey, selectedType, searchTerm])

  const reload = () => {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  const handleNew = () => {
    setEditingCategory(null)
    setShowForm(true)
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setShowForm(true)
  }

  const handleSaved = () => {
    setShowForm(false)
    setEditingCategory(null)
    reload()
  }

  const handleToggleStatus = async (category) => {
    setSaving(true)
    try {
      await categoryService.patchCategoryStatus(category.id, !category.active)
      reload()
    } catch {
      window.alert('Não foi possível alterar o status do padrão.')
    } finally {
      setSaving(false)
    }
  }

  const handleRevalidate = async (category) => {
    setSaving(true)
    try {
      const result = await categoryService.revalidatePrices(category.id)
      window.alert(`Preços recalculados. Itens atualizados: ${result.updatedProducts}.`)
      reload()
    } catch (err) {
      window.alert(err.response?.data?.message || 'Não foi possível reavaliar os preços.')
    } finally {
      setSaving(false)
    }
  }

  const formatPercent = (value) => (value == null ? 'Não definido' : `${value}%`)

  return (
    <div className="w-full space-y-6">
      {showForm && (
        <div ref={formRef}>
          <CategoryForm
            initialCategory={editingCategory}
            onCancel={() => {
              setShowForm(false)
              setEditingCategory(null)
            }}
            onSaved={handleSaved}
          />
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
              <Tags className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Padrões de precificação</h2>
              <p className="text-xs text-slate-500">
                Defina margem, impostos, taxas e desconto padrão para os produtos e serviços que você cadastrar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo padrão
          </button>
        </div>

        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome do padrão..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              />
            </div>

            <div className="flex rounded-xl bg-slate-200/70 p-1 self-start">
              {[
                { key: '', label: `Todas (${totalElements})` },
                { key: 'PRODUTO', label: 'Produtos' },
                { key: 'SERVICO', label: 'Serviços' }
              ].map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setSelectedType(option.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedType === option.key
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-medium transition cursor-pointer self-end md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Carregando padrões de precificação...</p>
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
        ) : categories.length === 0 ? (
          <div className="p-12 text-center">
            <Tags className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700 mb-1">Nenhum padrão cadastrado</p>
            <p className="text-xs text-slate-500 mb-4">
              Crie um padrão para aplicar a mesma margem, impostos e taxas a vários produtos e serviços.
            </p>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro padrão
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((category) => (
              <div
                key={category.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Tags className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm">{category.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {category.type === 'SERVICO' ? 'Serviço' : 'Produto'}
                      </span>
                      {!category.active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600">
                          Inativa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                      <span>
                        Margem: <strong className="text-slate-800 font-semibold">{formatPercent(category.targetProfitMargin)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Tributos: <strong className="text-slate-800 font-semibold">{formatPercent(category.taxRate)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Teto desconto: <strong className="text-slate-800 font-semibold">{formatPercent(category.maxDiscountAllowed)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Variáveis: <strong className="text-slate-800 font-semibold">{formatPercent(category.variableCostPercent)}</strong>
                      </span>
                      {category.parentName && (
                        <>
                          <span>•</span>
                          <span>Baseado em: {category.parentName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleRevalidate(category)}
                    disabled={saving}
                    title="Reavaliar preços"
                    className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(category)}
                    disabled={saving}
                    title={category.active ? 'Desativar' : 'Ativar'}
                    className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer disabled:opacity-50"
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(category)}
                    title="Editar"
                    className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Total: <strong>{totalElements}</strong> padrões cadastrados
          </span>
          <span className="text-[11px] text-slate-400">
            Valores não informados são assumidos pelo padrão superior
          </span>
        </div>
      </div>
    </div>
  )
}
