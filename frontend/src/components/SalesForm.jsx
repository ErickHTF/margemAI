import useDraft from '../hooks/useDraft'
import { useState, useEffect, useRef } from 'react'
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
import { EMPTY_SALE_DRAFT, hasSaleDraft, similarSaleDraft } from '../utils/saleDraft'
import productService from '../services/productService'
import { PAYMENT_METHODS } from '../constants/sales'
import usePaymentFees from '../hooks/usePaymentFees'
import { calculateSaleFee, formatFeePercent } from '../utils/paymentFees'
import { formatCurrencyBRL } from '../utils/formatters'
import { Button, Card, Field, IconButton, Input, Notice, Select } from './ui'

export default function SalesForm({ onSaleCreated, onNavigate, draft, onDraftChange, onBusyChange }) {
  const [initialProductId] = useState(draft?.selectedProductId)
  const [products, setProducts] = useState([])
  const [productsError, setProductsError] = useState(null)
  const [lastSale, setLastSale] = useState(null)
  const [feesVersion, setFeesVersion] = useState(0)
  const submittingRef = useRef(false)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState(() => draft?.selectedProductId ?? EMPTY_SALE_DRAFT.selectedProductId)
  const [customDescription, setCustomDescription] = useState(() => draft?.customDescription ?? EMPTY_SALE_DRAFT.customDescription)
  const [isCustomItem, setIsCustomItem] = useState(() => draft?.isCustomItem ?? EMPTY_SALE_DRAFT.isCustomItem)
  const [quantity, setQuantity] = useState(() => draft?.quantity ?? EMPTY_SALE_DRAFT.quantity)
  const [unitPrice, setUnitPrice] = useState(() => draft?.unitPrice ?? EMPTY_SALE_DRAFT.unitPrice)
  const [unitCost, setUnitCost] = useState(() => draft?.unitCost ?? EMPTY_SALE_DRAFT.unitCost)
  const [paymentMethod, setPaymentMethod] = useState(() => draft?.paymentMethod ?? EMPTY_SALE_DRAFT.paymentMethod)
  const [installments, setInstallments] = useState(() => draft?.installments ?? EMPTY_SALE_DRAFT.installments)
  const [customFee, setCustomFee] = useState(() => draft?.customFee ?? EMPTY_SALE_DRAFT.customFee)
  const [showCustomFee, setShowCustomFee] = useState(() => draft?.showCustomFee ?? EMPTY_SALE_DRAFT.showCustomFee)
  const [notes, setNotes] = useState(() => draft?.notes ?? EMPTY_SALE_DRAFT.notes)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const { getFee, loading: loadingFees, error: feesError } = usePaymentFees(feesVersion)

  useEffect(() => {
    const value = { selectedProductId, customDescription, isCustomItem, quantity, unitPrice, unitCost, paymentMethod, installments, customFee, showCustomFee, notes }
    onDraftChange?.(hasSaleDraft(value) ? value : null)
  }, [selectedProductId, customDescription, isCustomItem, quantity, unitPrice, unitCost, paymentMethod, installments, customFee, showCustomFee, notes, onDraftChange])

  const applyDraft = (value) => {
    setSelectedProductId(value.selectedProductId)
    setCustomDescription(value.customDescription)
    setIsCustomItem(value.isCustomItem)
    setQuantity(value.quantity)
    setUnitPrice(value.unitPrice)
    setUnitCost(value.unitCost)
    setPaymentMethod(value.paymentMethod)
    setInstallments(value.installments)
    setCustomFee(value.customFee)
    setShowCustomFee(value.showCustomFee)
    setNotes(value.notes)
  }
  const formDraft = { selectedProductId, customDescription, isCustomItem, quantity, unitPrice, unitCost, paymentMethod, installments, customFee, showCustomFee, notes }
  useDraft(formDraft, EMPTY_SALE_DRAFT)

  useEffect(() => {
    let cancelled = false
    const loadCatalog = async () => {
      setLoadingProducts(true)
      try {
        const data = await productService.getProducts({ size: 100, active: true })
        const catalog = data.content || []
        if (initialProductId && !catalog.some((p) => String(p.id) === String(initialProductId))) {
          try {
            const product = await productService.getProduct(initialProductId)
            if (product.active) catalog.push(product)
          } catch (err) {
            if (err.response?.status !== 404) throw err
          }
        }
        if (!cancelled) {
          setProducts(catalog)
        }
      } catch (err) {
        if (!cancelled) setProductsError(err.response?.data?.message || 'Não foi possível carregar o catálogo. Tente abrir Vendas novamente ou registre um item avulso.')
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    }
    loadCatalog()
    return () => {
      cancelled = true
    }
  }, [initialProductId])

  const handleProductSelect = (prodId) => {
    setUnitCost('')
    setSelectedProductId(prodId)
    if (!prodId) {
      setUnitPrice('')
      return
    }
    const found = products.find((p) => String(p.id) === String(prodId))
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
    if (submittingRef.current || loadingProducts || loadingFees) return
    setFeedback(null)

    if (!isCustomItem && !selectedProductId) {
      setFeedback({ type: 'error', message: 'Selecione um produto do catálogo ou marque "Item Avulso".' })
      return
    }

    if (!isCustomItem && !products.some((p) => String(p.id) === String(selectedProductId))) {
      setFeedback({ type: 'error', message: 'Este produto não está disponível no catálogo ativo. Selecione outro produto ou use um item avulso.' })
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

    submittingRef.current = true
    onBusyChange?.(true)
    setSubmitting(true)

    const payload = {
      productId: isCustomItem ? null : selectedProductId,
      description: isCustomItem ? customDescription.trim() : (products.find(p => String(p.id) === String(selectedProductId))?.name || customDescription.trim()),
      quantity: Number(quantity),
      unitPrice: effectivePrice,
      unitCost: unitCost === '' ? null : Number(unitCost),
      paymentMethod,
      installments: paymentMethod === 'CREDITO_PARCELADO' ? Number(installments) : 1,
      customFeePercentage: showCustomFee && customFee !== '' ? Number(customFee) : null,
      notes: notes.trim() || null
    }

    try {
      await onSaleCreated(payload)
      setFeedback({ type: 'success', message: 'Venda registrada com sucesso!' })
      setLastSale(payload)
      applyDraft(EMPTY_SALE_DRAFT)
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao registrar venda.' })
    } finally {
      submittingRef.current = false
      onBusyChange?.(false)
      setSubmitting(false)
    }
  }

  const repeatSale = async () => {
    if (submittingRef.current || loadingProducts) return
    setLoadingProducts(true)
    setFeedback(null)
    try {
      const data = await productService.getProducts({ size: 100, active: true })
      const catalog = data.content || []
      if (lastSale.productId && !catalog.some((p) => String(p.id) === String(lastSale.productId))) {
        try {
          const product = await productService.getProduct(lastSale.productId)
          if (product.active) catalog.push(product)
        } catch (err) {
          if (err.response?.status !== 404) throw err
        }
      }
      setProducts(catalog)
      setProductsError(null)
      const next = similarSaleDraft(lastSale)
      if (next.selectedProductId && !catalog.some((p) => String(p.id) === String(next.selectedProductId))) {
        next.selectedProductId = ''
        setFeedback({ type: 'error', message: 'O produto anterior não está disponível. Selecione outro produto ou use um item avulso antes de confirmar.' })
      }
      applyDraft(next)
      setFeesVersion((version) => version + 1)
    } catch (err) {
      setProductsError(err.response?.data?.message || 'Não foi possível conferir o catálogo. Tente novamente antes de repetir a venda.')
      setFeedback({ type: 'error', message: 'Não foi possível preparar a venda semelhante. Seus dados atuais foram mantidos.' })
    } finally {
      setLoadingProducts(false)
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
    <Card id="sale-form">
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
            setUnitCost('')
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

      {lastSale && !hasSaleDraft(formDraft) && (
        <div className="mb-4 text-sm text-slate-600">
          <button type="button" className="font-semibold text-indigo-700 underline" disabled={submitting || loadingProducts} onClick={repeatSale}>Registrar outra venda semelhante</button>
          <p>Reaproveita item, preço e pagamento. Quantidade volta a 1; observações e taxa avulsa são apagadas. Revise e confirme o novo registro.</p>
        </div>
      )}
      <p className="mb-4 text-xs text-slate-500">Seu rascunho é mantido apenas nesta sessão ao visitar outros módulos. Recarregar a página ou sair apaga os dados.</p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={submitting} aria-busy={submitting} className="space-y-6">
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

          {!isCustomItem && !loadingProducts && (productsError || products.length === 0 || onNavigate) && (
            <div className="md:col-span-12 space-y-1 text-sm">
              {productsError
                ? <Notice tone="rose" size="sm">{productsError}</Notice>
                : products.length === 0 && <p className="text-slate-600">Seu catálogo ainda não tem produtos ativos. Cadastre um produto ou use um item avulso.</p>}
              {onNavigate && (
                <Button variant="link" size="sm" className="underline" onClick={() => onNavigate('products')}>
                  {products.length === 0 && !productsError ? 'Cadastrar produto no catálogo' : 'Abrir catálogo para conferir produtos'}
                </Button>
              )}
            </div>
          )}
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

        <Field
          size="sm"
          label="Custo unitário da operação (R$)"
          hint={`${isCustomItem
            ? 'Informe o custo do item avulso. Se deixar vazio, será registrado R$ 0,00.'
            : 'Se deixar vazio, usa os custos vinculados ao produto; sem valor vinculado, usa o custo base manual.'} O custo fica guardado nesta venda e não muda quando o catálogo for alterado. Um valor informado aqui vale apenas para esta venda e substitui o custo do catálogo.`}
        >
          <Input
            id="sale-unit-cost"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            prefix="R$"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            placeholder={isCustomItem ? '0,00' : 'Usar custo do catálogo'}
          />
        </Field>

        <div>
          {feesError && (
            <p role="status" className="mb-2 text-[11px] font-medium text-amber-700">{feesError}</p>
          )}
          {onNavigate && (
            <Button variant="link" size="sm" className="mb-2 underline" onClick={() => onNavigate('payment-methods')}>
              Conferir taxas configuradas e voltar à venda
            </Button>
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
            disabled={loadingProducts || loadingFees || calculation.gross <= 0}
          >
            {submitting ? 'Registrando Venda...' : 'Confirmar e Lançar Venda'}
          </Button>
        </div>
        </fieldset>
      </form>
    </Card>
  )
}
