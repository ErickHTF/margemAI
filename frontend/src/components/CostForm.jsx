import useDraft from '../hooks/useDraft'
import { useState } from 'react'
import {
  Save,
  ArrowLeft,
  Receipt,
  CalendarDays,
  Repeat,
  Tag,
  Package
} from 'lucide-react'
import { maskCurrency, unmaskCurrency, currencyToDigits } from '../utils/formatters'
import { Button, Card, Field, Input, Notice, Select } from './ui'

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

const EMPTY_DRAFT_BASELINE = {
  name: '',
  category: '',
  productId: '',
  amountDigits: '',
  dueDate: '',
  recurring: true
}

export default function CostForm({ kind, service, categories, initialCost, onCancel, onSaved, products = [] }) {
  const labels = KIND_LABELS[kind]
  const amountKey = labels.amountField
  const isVariable = kind === 'variable'
  const isEditing = Boolean(initialCost?.id)
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
  const { dirty, changes, guard } = useDraft(
    { name, category, productId, amountDigits, dueDate, recurring },
    isEditing ? undefined : EMPTY_DRAFT_BASELINE
  )

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
        if (!value) return 'Selecione o padrão de precificação.'
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
      const saved = isEditing
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

  const fieldError = (field) => (touched[field] && errors[field]) || undefined

  return (
    <Card padding="lg" className="w-full">
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Receipt className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          {isEditing ? labels.titleEdit : labels.titleNew}
        </h2>
        <p className="text-sm text-slate-500">{labels.description}</p>
      </div>

      {initialCost?.fromSuggestion && (
        <Notice tone="sky" size="sm" title="Sugestão do seu segmento — ajuste como preferir" className="mb-4 text-left">
          {initialCost.whyItMatters
            ? `${initialCost.whyItMatters} Todos os campos abaixo são editáveis para você ajustar antes de salvar.`
            : 'Os campos foram preenchidos como base inicial. Altere nome, padrão de precificação ou valor conforme a realidade do seu negócio.'}
        </Notice>
      )}

      {kind === 'fixed' && isEditing && (
        <p className="mb-4 text-xs text-amber-800 bg-amber-50 rounded-xl p-3">
          As competências até o mês atual serão preservadas. As alterações valem para os próximos meses.
        </p>
      )}
      {serverError && (
        <Notice tone="rose" title={serverError.message} className="mb-6 text-left">
          {serverError.details?.length > 0 && (
            <ul className="mt-1.5 list-disc list-inside text-xs text-rose-700 space-y-1">
              {serverError.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4 text-left">
        {dirty && <p role="status" className="text-sm text-amber-700">{changes} {changes === 1 ? 'alteração não salva' : 'alterações não salvas'}</p>}
        <Field label="Nome" error={fieldError('name')}>
          <Input
            id="cost-name"
            type="text"
            Icon={Receipt}
            value={name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={(e) => handleBlur('name', e.target.value)}
            placeholder={kind === 'fixed' ? 'ex: Aluguel do ponto' : 'ex: Matéria-prima (tecido)'}
          />
        </Field>

        <Field label="Padrão de precificação" error={fieldError('category')}>
          <Select
            id="cost-category"
            Icon={Tag}
            value={category}
            onChange={(e) => handleChange('category', e.target.value)}
            onBlur={(e) => handleBlur('category', e.target.value)}
          >
            <option value="">Selecione o padrão de precificação...</option>
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>

        {isVariable && (products.length > 0 || missingProduct) && (
          <Field
            label="Produto associado (opcional)"
            hint={
              missingProduct ? (
                <span className="text-amber-600">
                  O produto vinculado foi excluído. Selecione "Nenhum" ou outro produto para salvar.
                </span>
              ) : (
                'Ao vincular, o valor soma no custo direto unitário do produto.'
              )
            }
          >
            <Select
              id="cost-product"
              Icon={Package}
              value={productId}
              onChange={(e) => handleChange('product', e.target.value)}
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
            </Select>
          </Field>
        )}

        <Field label={labels.amountLabel} error={fieldError('amount')}>
          <Input
            id="cost-amount"
            type="text"
            inputMode="numeric"
            Icon={Receipt}
            value={maskCurrency(amountDigits)}
            onChange={(e) => handleChange('amount', e.target.value)}
            onBlur={(e) => handleBlur('amount', e.target.value)}
            placeholder="0,00"
          />
        </Field>

        {kind === 'fixed' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Vencimento (opcional)" error={fieldError('dueDate')}>
              <Input
                id="cost-dueDate"
                type="date"
                Icon={CalendarDays}
                value={dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                onBlur={(e) => handleBlur('dueDate', e.target.value)}
              />
            </Field>

            <div>
              <p className="mb-1.5 block text-sm font-medium text-slate-700">Recorrência</p>
              <Button
                variant={recurring ? 'soft' : 'secondary'}
                Icon={Repeat}
                fullWidth
                aria-pressed={recurring}
                onClick={() => setRecurring(!recurring)}
              >
                {recurring ? 'Recorrente mensal' : 'Eventual (não recorrente)'}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
          <Button variant="secondary" Icon={ArrowLeft} className="w-full sm:flex-1" onClick={() => guard(onCancel)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" Icon={Save} loading={loading} disabled={!dirty} className="w-full sm:flex-1">
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
