import useDraft from '../hooks/useDraft'
import { useState, useEffect } from 'react'
import {
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Info
} from 'lucide-react'
import productService from '../services/productService'
import { PAYMENT_METHODS } from '../constants/sales'
import usePaymentFees from '../hooks/usePaymentFees'
import { calculateSaleFee, formatFeePercent } from '../utils/paymentFees'
import { formatCurrencyBRL } from '../utils/formatters'
import { Button, Card, Field, IconButton, Input, Notice, Select } from './ui'

export default function SalesForm({ onSaleCreated, onNavigate }) {
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [isCustomItem, setIsCustomItem] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [unitPrice, setUnitPrice] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [installments, setInstallments] = useState(1)
  const [customFee, setCustomFee] = useState('')
  const [showCustomFee, setShowCustomFee] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const draft = { selectedProductId, customDescription, isCustomItem, quantity, unitPrice, paymentMethod, installments, customFee, showCustomFee, notes }
  const { markSaved } = useDraft(draft)

  const { getFee, error: feesError } = usePaymentFees()

  useEffect(() => {
    let cancelled = false
    const loadCatalog = async () => {
      setLoadingProducts(true)
      try {
        const data = await productService.getProducts({ size: 100, active: true })
        if (!cancelled) {
          setProducts(data.content || [])
        }
      } catch {
        // Ignora ou trata silenciosamente caso não consiga listar
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }
    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [])

  const handleProductSelect = (prodId) => {
    setSelectedProductId(prodId)
    if (!prodId) {
      setUnitPrice('')
      return
    }
    const found = products.find((p) => p.id === prodId)
    if (found) {
      setUnitPrice(String(found.sellingPrice || ''))
      setCustomDescription(found.name)
    }
  }

  const effectivePrice = parseFloat(unitPrice) || 0
  const calculation = calculateSaleFee({
    quantity,
    unitPrice: effectivePrice,
    fee: getFee(paymentMethod, installments),
    customFeePercent: showCustomFee && customFee !== '' ? customFee : null
  })

  const describeFee = ({ mdrFeePercent, fixedFeeAmount }) =>
    fixedFeeAmount > 0
      ? `${formatFeePercent(mdrFeePercent)} + ${formatCurrencyBRL(fixedFeeAmount)}`
      : formatFeePercent(mdrFeePercent)

  const methodFeeLabel = (methodKey) =>
    methodKey === 'CREDITO_PARCELADO'
      ? `A partir de ${describeFee(getFee(methodKey, 2))}`
      : `Taxa ${describeFee(getFee(methodKey))}`

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)

    if (!isCustomItem && !selectedProductId) {
      setFeedback({ type: 'error', message: 'Selecione um produto do catálogo ou marque "Item Avulso".' })
      return
    }

    if (isCustomItem && !customDescription.trim()) {
      setFeedback({ type: 'error', message: 'Informe a descrição do item avulso.' })
      return
    }

    if (effectivePrice <= 0) {
      setFeedback({ type: 'error', message: 'O preço unitário deve ser maior que zero.' })
      return
    }

    setSubmitting(true)

    const payload = {
      productId: isCustomItem ? null : selectedProductId,
      description: isCustomItem ? customDescription.trim() : (products.find(p => p.id === selectedProductId)?.name || customDescription.trim()),
      quantity: Number(quantity),
      unitPrice: effectivePrice,
      paymentMethod,
      installments: paymentMethod === 'CREDITO_PARCELADO' ? Number(installments) : 1,
      customFeePercentage: showCustomFee && customFee !== '' ? Number(customFee) : null,
      notes: notes.trim() || null
    }

    try {
      await onSaleCreated(payload)
      setFeedback({ type: 'success', message: 'Venda registrada com sucesso!' })
      markSaved({ ...draft, selectedProductId: isCustomItem ? selectedProductId : '', customDescription: '', unitPrice: '', quantity: 1, notes: '', customFee: '', showCustomFee: false })
      if (!isCustomItem) {
        setSelectedProductId('')
      }
      setCustomDescription('')
      setUnitPrice('')
      setQuantity(1)
      setNotes('')
      setCustomFee('')
      setShowCustomFee(false)
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao registrar venda.' })
    } finally {
      setSubmitting(false)
    }
  }

  const getMethodIcon = (key) => {
    switch (key) {
      case 'DINHEIRO':
        return <Banknote className="w-5 h-5" />
      case 'PIX':
        return <QrCode className="w-5 h-5" />
      case 'DEBITO':
        return <CreditCard className="w-5 h-5" />
      case 'CREDITO_A_VISTA':
        return <CreditCard className="w-5 h-5" />
      case 'CREDITO_PARCELADO':
        return <Layers className="w-5 h-5" />
      default:
        return <ShoppingBag className="w-5 h-5" />
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            Lançamento Rápido de Venda
          </h2>
        </div>
        <Button
          variant={isCustomItem ? 'soft' : 'secondary'}
          size="sm"
          aria-pressed={isCustomItem}
          onClick={() => {
            setIsCustomItem(!isCustomItem)
            setSelectedProductId('')
            setUnitPrice('')
          }}
        >
          {isCustomItem ? '← Usar Catálogo' : '+ Item Avulso / Serviço'}
        </Button>
      </div>

      {feedback && (
        <Notice tone={feedback.type === 'success' ? 'emerald' : 'rose'} className="mb-6 font-medium">
          {feedback.message}
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <Field size="sm" label={isCustomItem ? 'Descrição do Item / Serviço' : 'Produto do Catálogo'} className="md:col-span-7">
            {isCustomItem ? (
              <Input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Ex: Consultoria rápida, Bolo personalizado..."
              />
            ) : (
              <Select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                disabled={loadingProducts}
              >
                <option value="">Selecione um produto cadastrado...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrencyBRL(p.sellingPrice)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field size="sm" label="Quantidade" htmlFor="sale-quantity" className="md:col-span-2">
            <div className="flex items-center gap-1">
              <IconButton label="Diminuir quantidade" Icon={Minus} onClick={() => handleQuantityChange(-1)} />
              <Input
                id="sale-quantity"
                type="number"
                min="0.01"
                step="any"
                className="w-full min-w-0 text-center"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
              />
              <IconButton label="Aumentar quantidade" Icon={Plus} onClick={() => handleQuantityChange(1)} />
            </div>
          </Field>

          <Field size="sm" label="Preço Unitário (R$)" className="md:col-span-3">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0,00"
            />
          </Field>
        </div>

        <div>
          {feesError && (
            <p role="status" className="mb-2 text-[11px] font-medium text-amber-700">{feesError}</p>
          )}
          <p id="sale-payment-method" className="block text-xs font-semibold text-slate-700 mb-2">
            Forma de Pagamento
          </p>
          <div role="group" aria-labelledby="sale-payment-method" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method.key
              return (
                <button
                  type="button"
                  key={method.key}
                  aria-pressed={active}
                  onClick={() => {
                    setPaymentMethod(method.key)
                    if (method.key !== 'CREDITO_PARCELADO') {
                      setInstallments(1)
                    } else if (installments === 1) {
                      setInstallments(2)
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg mb-1.5 ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {getMethodIcon(method.key)}
                  </div>
                  <span className="text-xs font-bold">{method.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{methodFeeLabel(method.key)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {paymentMethod === 'CREDITO_PARCELADO' && (
          <Card tone="indigo" inset padding="sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label htmlFor="sale-installments" className="text-xs font-bold text-indigo-900">Número de Parcelas</label>
                <p className="text-[11px] text-indigo-700">Taxas conforme Configurações › Taxas de Pagamento</p>
              </div>
              <Select
                id="sale-installments"
                size="sm"
                className="w-auto"
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}x (Taxa: {describeFee(getFee('CREDITO_PARCELADO', n))})
                  </option>
                ))}
              </Select>
            </div>
          </Card>
        )}

        <div>
          <Button variant="link" size="sm" aria-expanded={showCustomFee} onClick={() => setShowCustomFee(!showCustomFee)}>
            {showCustomFee ? '− Voltar para a taxa configurada' : '+ Usar outra taxa só nesta venda'}
          </Button>
          {showCustomFee && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-3">
                <Input
                  size="sm"
                  className="w-32"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  aria-label="Taxa avulsa desta venda (%)"
                  placeholder="Ex: 2.99"
                  value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
                />
                <span className="text-xs text-slate-500">% retido pela adquirente</span>
              </div>
              <Notice tone="amber" size="sm" Icon={Info} role="note">
                <p>
                  Esta taxa vale <strong>apenas para esta venda</strong>. Após o lançamento, as próximas vendas
                  voltam a usar a taxa configurada. Para alterar a taxa de forma permanente, acesse{' '}
                  {onNavigate ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="underline underline-offset-2"
                      onClick={() => onNavigate('payment-methods')}
                    >
                      Configurações › Taxas de Pagamento
                    </Button>
                  ) : (
                    <strong>Configurações › Taxas de Pagamento</strong>
                  )}
                  .
                </p>
              </Notice>
            </div>
          )}
        </div>

        <Field size="sm" label="Observações / Notas (Opcional)">
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Pagamento na entrega, cliente VIP..."
          />
        </Field>

        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            <div className="sm:pr-4">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Valor Bruto</span>
              <p className="text-xl font-bold text-white mt-0.5">{formatCurrencyBRL(calculation.gross)}</p>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-4">
              <span className="text-[11px] text-rose-300 uppercase tracking-wider font-medium">
                Taxa Operadora ({describeFee({ mdrFeePercent: calculation.feePercent, fixedFeeAmount: calculation.fixedFee })})
              </span>
              <p className="text-xl font-bold text-rose-400 mt-0.5">
                − {formatCurrencyBRL(calculation.feeAmount)}
              </p>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-4">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold">
                Líquido no Caixa
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">
                {formatCurrencyBRL(calculation.netAmount)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            loading={submitting}
            TrailingIcon={ArrowRight}
            className="w-full sm:w-auto"
            disabled={calculation.gross <= 0}
          >
            {submitting ? 'Registrando Venda...' : 'Confirmar e Lançar Venda'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
