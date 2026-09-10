import { useState } from 'react'
import {
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  ArrowLeft,
  Receipt,
  CalendarDays,
  Repeat,
  Tag,
  Package
} from 'lucide-react'
import { maskCurrency, unmaskCurrency, currencyToDigits } from '../utils/formatters'

const KIND_LABELS = {
  fixed: {
    titleNew: 'Novo custo fixo',
    titleEdit: 'Editar custo fixo',
    amountField: 'amount',
    amountLabel: 'Valor mensal (R$)',
    description: 'Despesas recorrentes como aluguel, energia, internet e DAS MEI.'
  },
  variable: {
    titleNew: 'Novo custo variável',
    titleEdit: 'Editar custo variável',
    amountField: 'unitAmount',
    amountLabel: 'Valor unitário (R$)',
    description: 'Custos que variam por produto ou serviço, como matéria-prima e embalagem.'
  }
}

export default function CostForm({ kind, service, categories, initialCost, onCancel, onSaved, products = [] }) {
  const labels = KIND_LABELS[kind]
  const amountKey = labels.amountField
  const isVariable = kind === 'variable'
  const missingProduct =
    isVariable && initialCost?.productId && !products.some((p) => p.id === initialCost.productId)
      ? { id: initialCost.productId, name: initialCost.productName }
      : null

  const [name, setName] = useState(initialCost?.name || '')
  const [category, setCategory] = useState(initialCost?.category || '')
  const [productId, setProductId] = useState(initialCost?.productId || '')
  const [amountDigits, setAmountDigits] = useState(currencyToDigits(initialCost?.[amountKey]))
  const [dueDate, setDueDate] = useState(initialCost?.dueDate || '')
  const [recurring, setRecurring] = useState(initialCost ? Boolean(initialCost.recurring) : true)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'O nome é obrigatório.'
        return null

      case 'category':
        if (!value) return 'Selecione a categoria.'
        return null

      case 'amount':
        if (!value) return `Informe o ${labels.amountLabel.toLowerCase()}.`
        if (unmaskCurrency(value) <= 0) return 'O valor deve ser maior que zero.'
        return null

      case 'dueDate':
        if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Data inválida.'
        return null

      default:
        return null
    }
  }

  const handleChange = (field, value) => {
    const setters = { name: setName, category: setCategory, product: setProductId, amount: setAmountDigits, dueDate: setDueDate }
    setters[field]?.(value)
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
    }
    if (serverError) setServerError(null)
  }

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
  }

  const validateAll = () => {
    const newErrors = {
      name: validateField('name', name),
      category: validateField('category', category),
      amount: validateField('amount', amountDigits),
      dueDate: validateField('dueDate', dueDate)
    }
    setErrors(newErrors)
    setTouched({ name: true, category: true, amount: true, dueDate: true })
    return !Object.values(newErrors).some(Boolean)
  }

  const buildPayload = () => {
    const base = {
      name: name.trim(),
      category,
      [amountKey]: unmaskCurrency(amountDigits)
    }
    if (isVariable) {
      base.productId = productId || null
    } else {
      base.dueDate = dueDate || null
      base.recurring = recurring
    }
    return base
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    if (!validateAll()) return

    setLoading(true)
    try {
      const payload = buildPayload()
      const saved = initialCost
        ? await service.update(initialCost.id, payload)
        : await service.create(payload)
      if (onSaved) onSaved(saved)
    } catch (err) {
      const errorData = err.response?.data
      if (errorData) {
        const details = Array.isArray(errorData.details) ? errorData.details : []
        setServerError({ message: errorData.message || 'Erro ao salvar o custo.', details })
      } else {
        setServerError({
          message: 'Falha de conexão com o servidor. Verifique se o backend está em execução.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 ${
      touched[field] && errors[field]
        ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
        : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
    }`

  const fieldIcon = (Icon) => (
    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
      <Icon className="w-5 h-5" />
    </div>
  )

  const fieldError = (field) =>
    touched[field] && errors[field] ? (
      <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        {errors[field]}
      </p>
    ) : null

  return (
    <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {initialCost ? labels.titleEdit : labels.titleNew}
        </h2>
        <p className="text-sm text-slate-500">{labels.description}</p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-sm">{serverError.message}</p>
            {serverError.details?.length > 0 && (
              <ul className="mt-1.5 list-disc list-inside text-xs text-rose-700 space-y-1">
                {serverError.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
        <div>
          <label htmlFor="cost-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome
          </label>
          <div className="relative">
            {fieldIcon(Receipt)}
            <input
              id="cost-name"
              type="text"
              value={name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={(e) => handleBlur('name', e.target.value)}
              placeholder={kind === 'fixed' ? 'ex: Aluguel do ponto' : 'ex: Matéria-prima (tecido)'}
              className={inputClass('name')}
            />
          </div>
          {fieldError('name')}
        </div>

        <div>
          <label htmlFor="cost-category" className="block text-sm font-medium text-slate-700 mb-1.5">
            Categoria
          </label>
          <div className="relative">
            {fieldIcon(Tag)}
            <select
              id="cost-category"
              value={category}
              onChange={(e) => handleChange('category', e.target.value)}
              onBlur={(e) => handleBlur('category', e.target.value)}
              className={`${inputClass('category')} appearance-none`}
            >
              <option value="">Selecione a categoria...</option>
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {fieldError('category')}
        </div>

        {isVariable && (products.length > 0 || missingProduct) && (
          <div>
            <label htmlFor="cost-product" className="block text-sm font-medium text-slate-700 mb-1.5">
              Produto associado (opcional)
            </label>
            <div className="relative">
              {fieldIcon(Package)}
              <select
                id="cost-product"
                value={productId}
                onChange={(e) => handleChange('product', e.target.value)}
                className={`${inputClass('product')} appearance-none`}
              >
                <option value="">Nenhum (custo geral)</option>
                {missingProduct && (
                  <option value={missingProduct.id}>
                    {missingProduct.name || 'Produto vinculado'} (indisponível)
                  </option>
                )}
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.type === 'PRODUTO' ? 'produto' : 'serviço'})
                  </option>
                ))}
              </select>
            </div>
            {missingProduct ? (
              <p className="text-xs text-amber-600 mt-1.5">
                O produto vinculado foi excluído. Selecione "Nenhum" ou outro produto para salvar.
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1.5">
                Ao vincular, o valor soma no custo direto unitário do produto.
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="cost-amount" className="block text-sm font-medium text-slate-700 mb-1.5">
            {labels.amountLabel}
          </label>
          <div className="relative">
            {fieldIcon(Receipt)}
            <input
              id="cost-amount"
              type="text"
              inputMode="numeric"
              value={maskCurrency(amountDigits)}
              onChange={(e) => handleChange('amount', e.target.value)}
              onBlur={(e) => handleBlur('amount', e.target.value)}
              placeholder="0,00"
              className={inputClass('amount')}
            />
          </div>
          {fieldError('amount')}
        </div>

        {kind === 'fixed' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cost-dueDate" className="block text-sm font-medium text-slate-700 mb-1.5">
                Vencimento (opcional)
              </label>
              <div className="relative">
                {fieldIcon(CalendarDays)}
                <input
                  id="cost-dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                  onBlur={(e) => handleBlur('dueDate', e.target.value)}
                  className={inputClass('dueDate')}
                />
              </div>
              {fieldError('dueDate')}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Recorrência</label>
              <button
                type="button"
                onClick={() => setRecurring(!recurring)}
                className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  recurring
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Repeat className="w-4 h-4" />
                {recurring ? 'Recorrente mensal' : 'Eventual (não recorrente)'}
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
