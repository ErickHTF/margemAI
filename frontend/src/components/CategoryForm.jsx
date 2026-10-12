import useDraft from '../hooks/useDraft'
import { useEffect, useState } from 'react'
import {
  X,
  Package,
  Wrench
} from 'lucide-react'
import { categoryService } from '../services/categoryService'
import { Button, Card, Field, IconButton, Input, Notice, Select } from './ui'

export default function CategoryForm({ initialCategory, onCancel, onSaved }) {
  const isEditing = Boolean(initialCategory?.id)

  const [formData, setFormData] = useState({
    name: initialCategory?.name || '',
    type: initialCategory?.type || 'PRODUTO',
    targetProfitMargin: initialCategory?.targetProfitMargin != null ? String(initialCategory.targetProfitMargin) : '',
    taxRate: initialCategory?.taxRate != null ? String(initialCategory.taxRate) : '',
    maxDiscountAllowed: initialCategory?.maxDiscountAllowed != null ? String(initialCategory.maxDiscountAllowed) : '',
    variableCostPercent: initialCategory?.variableCostPercent != null ? String(initialCategory.variableCostPercent) : '',
    parentId: initialCategory?.parentId || ''
  })

  const { dirty, changes, guard } = useDraft(formData)

  const [categories, setCategories] = useState([])
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const loadParents = async () => {
      try {
        const data = await categoryService.getCategories({ page: 0, size: 100 })
        if (!cancelled) setCategories(data.content || [])
      } catch {
        if (!cancelled) setCategories([])
      }
    }
    loadParents()
    return () => {
      cancelled = true
    }
  }, [])

  const validatePercent = (value, { min, max, label }) => {
    if (value === '' || value == null) return null
    const num = Number(value)
    if (isNaN(num)) return `Informe um ${label} válido.`
    if (num < min || num > max) return `${label} deve estar entre ${min}% e ${max}%.`
    return null
  }

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'O nome do padrão é obrigatório.'
        if (value.length > 150) return 'O nome deve ter no máximo 150 caracteres.'
        return null
      case 'type':
        if (!value) return 'Selecione se é Produto ou Serviço.'
        return null
      case 'targetProfitMargin':
        return validatePercent(value, { min: 0.01, max: 99.99, label: 'a margem de lucro' })
      case 'taxRate':
        return validatePercent(value, { min: 0, max: 99.99, label: 'a alíquota tributária' })
      case 'maxDiscountAllowed':
        return validatePercent(value, { min: 0, max: 100, label: 'o teto de desconto' })
      case 'variableCostPercent':
        return validatePercent(value, { min: 0, max: 99.99, label: 'as despesas variáveis' })
      default:
        return null
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) {
      setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    }
    if (serverError) setServerError(null)
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const validateAll = () => {
    const newErrors = {
      name: validateField('name', formData.name),
      type: validateField('type', formData.type),
      targetProfitMargin: validateField('targetProfitMargin', formData.targetProfitMargin),
      taxRate: validateField('taxRate', formData.taxRate),
      maxDiscountAllowed: validateField('maxDiscountAllowed', formData.maxDiscountAllowed),
      variableCostPercent: validateField('variableCostPercent', formData.variableCostPercent)
    }
    setErrors(newErrors)
    setTouched({
      name: true,
      type: true,
      targetProfitMargin: true,
      taxRate: true,
      maxDiscountAllowed: true,
      variableCostPercent: true
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
        type: formData.type,
        targetProfitMargin: formData.targetProfitMargin === '' ? null : Number(formData.targetProfitMargin),
        taxRate: formData.taxRate === '' ? null : Number(formData.taxRate),
        maxDiscountAllowed: formData.maxDiscountAllowed === '' ? null : Number(formData.maxDiscountAllowed),
        variableCostPercent: formData.variableCostPercent === '' ? null : Number(formData.variableCostPercent),
        parentId: formData.parentId || null
      }

      if (isEditing) {
        await categoryService.updateCategory(initialCategory.id, payload)
      } else {
        await categoryService.createCategory(payload)
      }

      onSaved()
    } catch (err) {
      const message = err.response?.data?.message || 'Falha ao salvar o padrão.'
      const details = Array.isArray(err.response?.data?.details) ? err.response.data.details : []
      setServerError({ message, details })
    } finally {
      setLoading(false)
    }
  }

  const parentOptions = categories.filter((category) => category.id !== initialCategory?.id)

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
              {isEditing ? 'Editar padrão de precificação' : 'Novo padrão de precificação'}
            </h3>
            <p className="text-xs text-slate-500">
              Defina margem, impostos, taxas e desconto que valem para os produtos e serviços deste padrão.
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
          <Field size="sm" label="Nome do padrão *" error={fieldError('name')} className="sm:col-span-2">
            <Input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: Bebidas, Serviços de Manutenção"
            />
          </Field>

          <Field size="sm" label="Tipo *">
            <Select name="type" value={formData.type} onChange={handleChange} onBlur={handleBlur}>
              <option value="PRODUTO">Produto</option>
              <option value="SERVICO">Serviço</option>
            </Select>
          </Field>
        </div>

        <Field size="sm" label="Padrão superior (opcional)" hint="Valores não informados aqui são assumidos pelo padrão superior.">
          <Select name="parentId" value={formData.parentId} onChange={handleChange}>
            <option value="">Nenhum (sem padrão superior)</option>
            {parentOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{category.active ? '' : ' (inativa)'}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field size="sm" label="Margem de Lucro (%)" error={fieldError('targetProfitMargin')}>
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
              placeholder="Ex: 25"
            />
          </Field>
          <Field size="sm" label="Alíquota Tributária (%)" error={fieldError('taxRate')}>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="99.99"
              name="taxRate"
              suffix="%"
              value={formData.taxRate}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: 6"
            />
          </Field>
          <Field size="sm" label="Teto de Desconto (%)" error={fieldError('maxDiscountAllowed')}>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              name="maxDiscountAllowed"
              suffix="%"
              value={formData.maxDiscountAllowed}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: 10"
            />
          </Field>
          <Field size="sm" label="Despesas Variáveis e Cartão (%)" error={fieldError('variableCostPercent')}>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="99.99"
              name="variableCostPercent"
              suffix="%"
              value={formData.variableCostPercent}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: 5"
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="secondary" className="w-full sm:w-auto" onClick={() => guard(onCancel)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" className="w-full sm:w-auto" loading={loading} disabled={!dirty}>
            {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar padrão'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
