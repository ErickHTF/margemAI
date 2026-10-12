import useDraft from '../hooks/useDraft'
import { useEffect, useState } from 'react'
import {
  Package,
  Wrench,
  DollarSign,
  X
} from 'lucide-react'
import { productService } from '../services/productService'
import { categoryService } from '../services/categoryService'
import { Button, Card, Field, IconButton, Input, Notice, Select } from './ui'

export default function ProductForm({ initialProduct, onCancel, onSaved }) {
  const isEditing = Boolean(initialProduct?.id)

  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    description: initialProduct?.description || '',
    type: initialProduct?.type || 'PRODUTO',
    baseCost: initialProduct?.baseCost ? String(initialProduct.baseCost) : '0.00',
    sellingPrice: initialProduct?.sellingPrice ? String(initialProduct.sellingPrice) : '',
    categoryId: initialProduct?.categoryId || '',
    targetProfitMargin: initialProduct?.targetProfitMargin != null ? String(initialProduct.targetProfitMargin) : ''
  })

  const { dirty, changes, guard } = useDraft(formData)

  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const loadCategories = async () => {
      try {
        const data = await categoryService.getCategories({ active: true, page: 0, size: 100 })
        if (!cancelled) setCategories(data.content || [])
      } catch {
        if (!cancelled) setCategories([])
      }
    }
    loadCategories()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedCategory = categories.find((category) => category.id === formData.categoryId)

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'O nome do item é obrigatório.'
        if (value.length > 200) return 'O nome deve ter no máximo 200 caracteres.'
        return null
      case 'type':
        if (!value) return 'Selecione se é Produto ou Serviço.'
        return null
      case 'baseCost': {
        const num = Number(value)
        if (isNaN(num) || num < 0) return 'Informe um custo base válido maior ou igual a zero.'
        return null
      }
      case 'sellingPrice': {
        const num = Number(value)
        if (!value || isNaN(num) || num <= 0) return 'Informe um preço de venda maior que zero.'
        return null
      }
      case 'targetProfitMargin': {
        if (value === '' || value == null) return null
        const num = Number(value)
        if (isNaN(num)) return 'Informe uma margem de lucro válida.'
        if (num < 0.01 || num > 99.99) return 'A margem deve estar entre 0.01% e 99.99%.'
        return null
      }
      default:
        return null
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (touched[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: validateField(name, value)
      }))
    }
    if (serverError) setServerError(null)
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value)
    }))
  }

  const validateAll = () => {
    const newErrors = {
      name: validateField('name', formData.name),
      type: validateField('type', formData.type),
      baseCost: validateField('baseCost', formData.baseCost),
      sellingPrice: validateField('sellingPrice', formData.sellingPrice),
      targetProfitMargin: validateField('targetProfitMargin', formData.targetProfitMargin)
    }
    setErrors(newErrors)
    setTouched({
      name: true,
      type: true,
      baseCost: true,
      sellingPrice: true,
      targetProfitMargin: true
    })
    return !Object.values(newErrors).some(Boolean)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    if (!validateAll()) return

    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        baseCost: Number(formData.baseCost) || 0,
        sellingPrice: Number(formData.sellingPrice),
        categoryId: formData.categoryId || null,
        targetProfitMargin: formData.targetProfitMargin === '' ? null : Number(formData.targetProfitMargin)
      }

      if (isEditing) {
        await productService.updateProduct(initialProduct.id, payload)
      } else {
        await productService.createProduct(payload)
      }

      onSaved()
    } catch (err) {
      const message = err.response?.data?.message || 'Falha ao salvar produto/serviço.'
      const details = Array.isArray(err.response?.data?.details) ? err.response.data.details : []
      setServerError({ message, details })
    } finally {
      setLoading(false)
    }
  }

  const fieldError = (field) => (touched[field] && errors[field]) || undefined

  return (
    <Card padding="lg" className="w-full">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            {formData.type === 'SERVICO' ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? 'Editar Item do Catálogo' : 'Novo Produto ou Serviço'}
            </h3>
            <p className="text-xs text-slate-500">
              Cadastre itens com custos e preço de venda para calcular a margem de lucro.
            </p>
          </div>
        </div>
        <IconButton label="Fechar formulário" Icon={X} size="lg" onClick={() => guard(onCancel)} />
      </div>

      {serverError && (
        <Notice tone="rose" size="sm" title={serverError.message} className="mb-6 text-left">
          {serverError.details && serverError.details.length > 0 && (
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-rose-700">
              {serverError.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
        {dirty && <p role="status" className="text-sm text-amber-700">{changes} {changes === 1 ? 'alteração não salva' : 'alterações não salvas'}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field size="sm" label="Nome do Item *" error={fieldError('name')} className="sm:col-span-2">
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: Camiseta Algodão ou Consultoria Fiscal"
            />
          </Field>

          <Field size="sm" label="Tipo *">
            <Select name="type" value={formData.type} onChange={handleChange} onBlur={handleBlur}>
              <option value="PRODUTO">Produto</option>
              <option value="SERVICO">Serviço</option>
            </Select>
          </Field>
        </div>

        <Field size="sm" label="Descrição (opcional)">
          <Input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Ex: Tamanhos P ao GG, 100% algodão penteado"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            size="sm"
            label="Padrão de precificação (opcional)"
            hint="Herde automaticamente margem, alíquota e teto de desconto do padrão."
          >
            <Select name="categoryId" value={formData.categoryId} onChange={handleChange}>
              <option value="">Sem padrão</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            size="sm"
            label="Margem de Lucro Desejada (%)"
            error={fieldError('targetProfitMargin')}
            hint={fieldError('targetProfitMargin') ? undefined : 'Em branco usa a margem assumida pelo padrão.'}
          >
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="99.99"
              name="targetProfitMargin"
              suffix="%"
              value={formData.targetProfitMargin}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder={selectedCategory ? `Herdada: ${selectedCategory.targetProfitMargin ?? '—'}%` : 'Ex: 25'}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            size="sm"
            label="Custo Base Manual (R$)"
            error={fieldError('baseCost')}
            hint="Se você vincular custos variáveis ao item, eles serão somados dinamicamente."
          >
            <Input
              type="number"
              step="0.01"
              min="0"
              name="baseCost"
              prefix="R$"
              value={formData.baseCost}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0.00"
            />
          </Field>

          <Field size="sm" label="Preço de Venda (R$) *" error={fieldError('sellingPrice')}>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              name="sellingPrice"
              prefix="R$"
              value={formData.sellingPrice}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="0.00"
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => guard(onCancel)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto" loading={loading} disabled={!dirty}>
            {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Item'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
