import useDraft from '../hooks/useDraft'
import PageHeader from './PageHeader'
import { useState, useEffect, useRef } from 'react'
import {
  Tags,
  Plus,
  Pencil,
  Search,
  RefreshCw,
  AlertCircle,
  Power
} from 'lucide-react'
import { categoryService } from '../services/categoryService'
import CategoryForm from './CategoryForm'
import { Badge, Button, Card, EmptyState, IconButton, Input, Notice, SegmentedControl } from './ui'

const PAGE_SIZE = 50

export default function CategoryManager() {
  const { guard } = useDraft(null)
  const [categories, setCategories] = useState([])
  const [totalElements, setTotalElements] = useState(0)
  const [selectedType, setSelectedType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [formVersion, setFormVersion] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [feedback, setFeedback] = useState(null)
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

  const hasFilters = Boolean(selectedType || searchTerm.trim())
  const clearFilters = () => {
    setLoading(true)
    setSelectedType('')
    setSearchTerm('')
  }

  const handleNew = () => {
    setFormVersion(version => version + 1)
    setEditingCategory(null)
    setShowForm(true)
  }

  const handleEdit = (category) => {
    setFormVersion(version => version + 1)
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
    setFeedback(null)
    try {
      await categoryService.patchCategoryStatus(category.id, !category.active)
      reload()
    } catch (err) {
      setFeedback({
        categoryId: category.id,
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível alterar o status do padrão.'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRevalidate = async (category) => {
    setSaving(true)
    setFeedback(null)
    try {
      const result = await categoryService.revalidatePrices(category.id)
      const updated = Number(result?.updatedProducts) || 0
      setFeedback({
        categoryId: category.id,
        type: 'success',
        message: `Preços do padrão "${category.name}" recalculados: ${updated} ${
          updated === 1 ? 'item atualizado' : 'itens atualizados'
        }.`
      })
      reload()
    } catch (err) {
      setFeedback({
        categoryId: category.id,
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível reavaliar os preços.'
      })
    } finally {
      setSaving(false)
    }
  }

  const formatPercent = (value) => (value == null ? 'Não definido' : `${value}%`)

  return (
    <div className="w-full space-y-6">
      <PageHeader Icon={Tags} title="Padrões de Preço" description="Defina parâmetros de preço para seus produtos e serviços.">
        <Button data-tour="categories-new" Icon={Plus} onClick={() => guard(handleNew)}>
          Novo padrão
        </Button>
      </PageHeader>
      {showForm && (
        <div ref={formRef}>
          <CategoryForm
            key={formVersion}
            initialCategory={editingCategory}
            onCancel={() => {
              setShowForm(false)
              setEditingCategory(null)
            }}
            onSaved={handleSaved}
          />
        </div>
      )}

      <Card padding="none" data-tour="categories-list" className="overflow-hidden">
        <div className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <Input
              type="text"
              Icon={Search}
              className="flex-1"
              aria-label="Buscar padrão"
              value={searchTerm}
              onChange={(e) => { setLoading(true); setSearchTerm(e.target.value) }}
              data-tour="categories-search"
              placeholder="Buscar por nome do padrão..."
            />

            <SegmentedControl
              label="Filtrar por tipo"
              className="self-start"
              options={[
                { value: '', label: `Todas (${totalElements})` },
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

          <Button variant="secondary" size="sm" Icon={RefreshCw} loading={loading} onClick={reload} className="self-end md:self-auto">
            Atualizar
          </Button>
        </div>

        {loading ? (
          <EmptyState loading title="Carregando padrões de precificação..." />
        ) : error ? (
          <EmptyState
            tone="rose"
            Icon={AlertCircle}
            title={error}
            action={<Button onClick={reload}>Tentar novamente</Button>}
          />
        ) : categories.length === 0 ? (
          <EmptyState
            Icon={Tags}
            title={hasFilters ? 'Nenhum resultado para os filtros selecionados' : 'Nenhum padrão cadastrado'}
            description={hasFilters
              ? 'Altere a busca ou limpe os filtros para ver os registros disponíveis.'
              : 'Crie um padrão para aplicar a mesma margem, impostos e taxas a vários produtos e serviços.'}
            action={hasFilters
              ? <Button size="sm" variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
              : <Button size="sm" Icon={Plus} onClick={() => guard(handleNew)}>Criar primeiro padrão</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((category) => (
              <div key={category.id}>
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Tags className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">{category.name}</h4>
                        <Badge>{category.type === 'SERVICO' ? 'Serviço' : 'Produto'}</Badge>
                        {!category.active && <Badge tone="rose">Inativa</Badge>}
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
                    <IconButton
                      label={`Reavaliar preços de ${category.name}`}
                      title="Reavaliar preços"
                      Icon={RefreshCw}
                      tone="emerald"
                      size="md"
                      onClick={() => handleRevalidate(category)}
                      disabled={saving}
                    />
                    <IconButton
                      label={`${category.active ? 'Desativar' : 'Ativar'} ${category.name}`}
                      title={category.active ? 'Desativar' : 'Ativar'}
                      Icon={Power}
                      tone="amber"
                      size="md"
                      onClick={() => handleToggleStatus(category)}
                      disabled={saving}
                    />
                    <IconButton
                      label={`Editar ${category.name}`}
                      title="Editar"
                      Icon={Pencil}
                      tone="indigo"
                      size="md"
                      onClick={() => guard(() => handleEdit(category))}
                    />
                  </div>
                </div>
                {feedback?.categoryId === category.id && (
                  <Notice size="sm" tone={feedback.type === 'success' ? 'emerald' : 'rose'} className="mx-5 mb-5">
                    <span className="font-medium">{feedback.message}</span>
                  </Notice>
                )}
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
      </Card>
    </div>
  )
}
