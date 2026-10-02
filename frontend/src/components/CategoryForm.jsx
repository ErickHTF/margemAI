import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Loader2,
  X,
  Package,
  Wrench
} from 'lucide-react'
import { categoryService } from '../services/categoryService'

const percentInputClass =
  'w-full pl-3 pr-8 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:outline-none focus:ring-2 border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'

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

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
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
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-left text-xs">
            <p className="font-semibold">{serverError.message}</p>
            {serverError.details && serverError.details.length > 0 && (
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-rose-700">
                {serverError.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do padrão *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: Bebidas, Serviços de Manutenção"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:outline-none focus:ring-2 ${
                touched.name && errors.name
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {touched.name && errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            >
              <option value="PRODUTO">Produto</option>
              <option value="SERVICO">Serviço</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Padrão superior (opcional)</label>
          <select
            name="parentId"
            value={formData.parentId}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          >
            <option value="">Nenhum (sem padrão superior)</option>
            {parentOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}{category.active ? '' : ' (inativa)'}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Valores não informados aqui são assumidos pelo padrão superior.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Margem de Lucro (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="99.99"
                name="targetProfitMargin"
                value={formData.targetProfitMargin}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ex: 25"
                className={`${percentInputClass} ${
                  touched.targetProfitMargin && errors.targetProfitMargin ? 'border-rose-400' : ''
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                %
              </span>
            </div>
            {touched.targetProfitMargin && errors.targetProfitMargin && (
              <p className="text-xs text-rose-600 mt-1">{errors.targetProfitMargin}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alíquota Tributária (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ex: 6"
                className={`${percentInputClass} ${touched.taxRate && errors.taxRate ? 'border-rose-400' : ''}`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                %
              </span>
            </div>
            {touched.taxRate && errors.taxRate && <p className="text-xs text-rose-600 mt-1">{errors.taxRate}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Teto de Desconto (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="maxDiscountAllowed"
                value={formData.maxDiscountAllowed}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ex: 10"
                className={`${percentInputClass} ${
                  touched.maxDiscountAllowed && errors.maxDiscountAllowed ? 'border-rose-400' : ''
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                %
              </span>
            </div>
            {touched.maxDiscountAllowed && errors.maxDiscountAllowed && (
              <p className="text-xs text-rose-600 mt-1">{errors.maxDiscountAllowed}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Despesas Variáveis e Cartão (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                name="variableCostPercent"
                value={formData.variableCostPercent}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ex: 5"
                className={`${percentInputClass} ${
                  touched.variableCostPercent && errors.variableCostPercent ? 'border-rose-400' : ''
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 text-sm">
                %
              </span>
            </div>
            {touched.variableCostPercent && errors.variableCostPercent && (
              <p className="text-xs text-rose-600 mt-1">{errors.variableCostPercent}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <span>{isEditing ? 'Salvar Alterações' : 'Salvar padrão'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
