import { useState, useEffect } from 'react'
import {
  Banknote,
  QrCode,
  CreditCard,
  Layers,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight
} from 'lucide-react'
import productService from '../services/productService'
import { PAYMENT_METHODS, calculateEstimatedFee } from '../constants/sales'
import { formatCurrencyBRL } from '../utils/formatters'

export default function SalesForm({ onSaleCreated }) {
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

  // Cálculo derivado inline durante o render (em conformidade estrita com o padrão da Skill React)
  const effectivePrice = parseFloat(unitPrice) || 0
  const calculation = calculateEstimatedFee(
    quantity,
    effectivePrice,
    paymentMethod,
    installments,
    showCustomFee && customFee !== '' ? customFee : null
  )

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
      setFeedback({ type: 'success', message: 'Venda lançada com sucesso no caixa!' })
      // Reset form para nova venda rápida
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            Lançamento Rápido de Venda
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registre uma entrada no caixa com desconto automático das taxas de maquininha.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCustomItem(!isCustomItem)
            setSelectedProductId('')
            setUnitPrice('')
          }}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
            isCustomItem
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isCustomItem ? '← Usar Catálogo' : '+ Item Avulso / Serviço'}
        </button>
      </div>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Seleção do Produto ou Descrição do Item */}
          <div className="md:col-span-7">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              {isCustomItem ? 'Descrição do Item / Serviço' : 'Produto do Catálogo'}
            </label>
            {isCustomItem ? (
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Ex: Consultoria rápida, Bolo personalizado..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            ) : (
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                disabled={loadingProducts}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition disabled:opacity-50"
              >
                <option value="">Selecione um produto cadastrado...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrencyBRL(p.sellingPrice)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Quantidade com Controles + / - */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Quantidade
            </label>
            <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
              <button
                type="button"
                onClick={() => handleQuantityChange(-1)}
                className="p-2.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full text-center bg-transparent text-sm font-semibold text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleQuantityChange(1)}
                className="p-2.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preço Unitário */}
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Preço Unitário (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>
        </div>

        {/* Métodos de Pagamento */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Forma de Pagamento
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {PAYMENT_METHODS.map((method) => {
              const active = paymentMethod === method.key
              return (
                <button
                  type="button"
                  key={method.key}
                  onClick={() => {
                    setPaymentMethod(method.key)
                    if (method.key !== 'CREDITO_PARCELADO') {
                      setInstallments(1)
                    } else if (installments === 1) {
                      setInstallments(2)
                    }
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-lg mb-1.5 ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {getMethodIcon(method.key)}
                  </div>
                  <span className="text-xs font-bold">{method.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{method.badge}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Opções de Parcelamento para Crédito Parcelado */}
        {paymentMethod === 'CREDITO_PARCELADO' && (
          <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-purple-900">Número de Parcelas</span>
                <p className="text-[11px] text-purple-700">Taxa base 4.5% + 1.0% por parcela adicional</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.target.value, 10))}
                  className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm font-semibold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x (Taxa: {(4.5 + (n - 1) * 1.0).toFixed(1)}%)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Ajuste de Taxa Customizada (Opcional) */}
        <div>
          <button
            type="button"
            onClick={() => setShowCustomFee(!showCustomFee)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            {showCustomFee ? '− Usar taxa padrão do sistema' : '+ Informar taxa personalizada da maquininha'}
          </button>
          {showCustomFee && (
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 2.99"
                value={customFee}
                onChange={(e) => setCustomFee(e.target.value)}
                className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-500">% retido pela adquirente</span>
            </div>
          )}
        </div>

        {/* Observações Opcionais */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
            Observações / Notas (Opcional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Pagamento na entrega, cliente VIP..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* Painel de Cálculo em Tempo Real */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            <div className="sm:pr-4">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">Valor Bruto</span>
              <p className="text-xl font-bold text-white mt-0.5">{formatCurrencyBRL(calculation.gross)}</p>
            </div>
            <div className="pt-2 sm:pt-0 sm:px-4">
              <span className="text-[11px] text-rose-300 uppercase tracking-wider font-medium">
                Taxa Operadora ({calculation.feePercent.toFixed(2)}%)
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

        {/* Botão de Envio */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || calculation.gross <= 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando Venda...
              </>
            ) : (
              <>
                Confirmar e Lançar Venda
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
