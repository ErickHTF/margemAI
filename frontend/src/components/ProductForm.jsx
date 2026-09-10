import { useState } from 'react'
import {
  Package,
  Wrench,
  DollarSign,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'
import { productService } from '../services/productService'

export default function ProductForm({ initialProduct, onCancel, onSaved }) {
  const isEditing = Boolean(initialProduct?.id)

  const [formData, setFormData] = useState({
    name: initialProduct?.name || '',
    description: initialProduct?.description || '',
    type: initialProduct?.type || 'PRODUTO',
    baseCost: initialProduct?.baseCost ? String(initialProduct.baseCost) : '0.00',
    sellingPrice: initialProduct?.sellingPrice ? String(initialProduct.sellingPrice) : ''
  })

  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

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
      sellingPrice: validateField('sellingPrice', formData.sellingPrice)
    }
    setErrors(newErrors)
    setTouched({
      name: true,
      type: true,
      baseCost: true,
      sellingPrice: true
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
        sellingPrice: Number(formData.sellingPrice)
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

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Item *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ex: Camiseta Algodão ou Consultoria Fiscal"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:outline-none focus:ring-2 ${
                touched.name && errors.name
                  ? 'border-rose-400 focus:ring-rose-200'
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            {touched.name && errors.name && (
              <p className="text-xs text-rose-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tipo *
            </label>
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
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Descrição (opcional)
          </label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Ex: Tamanhos P ao GG, 100% algodão penteado"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custo Base Manual (R$)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="baseCost"
                value={formData.baseCost}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0.00"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm bg-slate-50/50 focus:outline-none focus:ring-2 ${
                  touched.baseCost && errors.baseCost
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Se você vincular custos variáveis ao item, eles serão somados dinamicamente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Preço de Venda (R$) *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0.00"
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-semibold bg-emerald-50/30 focus:outline-none focus:ring-2 ${
                  touched.sellingPrice && errors.sellingPrice
                    ? 'border-rose-400 focus:ring-rose-200'
                    : 'border-emerald-300 focus:ring-emerald-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {touched.sellingPrice && errors.sellingPrice && (
              <p className="text-xs text-rose-600 mt-1">{errors.sellingPrice}</p>
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
              <span>{isEditing ? 'Salvar Alterações' : 'Cadastrar Item'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
