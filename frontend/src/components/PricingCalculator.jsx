import { useState, useEffect } from 'react'
import {
  Calculator,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Percent,
  Banknote,
  Package,
  Wrench,
  Settings2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { calculatePricing, simulateDiscount } from '../services/pricingService'
import { productService } from '../services/productService'
import { operationalService } from '../services/operationalService'
import {
  buildSebraeExplanation,
  SEBRAE_GOLDEN_RULE,
  SEBRAE_PERCENT_BASIS
} from '../utils/sebraeMethod'
import EducationalPill from './EducationalPill'
import { SEBRAE_PILLS, getPillById, selectContextualPill } from '../data/sebraePills'

export default function PricingCalculator() {
  const [formData, setFormData] = useState({
    baseCost: '50.00',
    fixedCostPercent: '10.00',
    variableCostPercent: '15.00',
    desiredMargin: '25.00',
    includeFixedCosts: true
  })

  const [products, setProducts] = useState([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)

  const [rateioSummary, setRateioSummary] = useState(null)
  const [useAutomaticFixedCosts, setUseAutomaticFixedCosts] = useState(false)
  const [showRateioConfig, setShowRateioConfig] = useState(false)
  const [savingRateio, setSavingRateio] = useState(false)
  const [rateioError, setRateioError] = useState('')
  const [rateioForm, setRateioForm] = useState({
    revenueBaselineMode: 'TARGET_REVENUE',
    revenueBaseline: '',
    automaticRateio: true,
    manualAllocatedFixedCostPercent: ''
  })

  const [pricingResult, setPricingResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [discountPercent, setDiscountPercent] = useState('10')
  const [discountResult, setDiscountResult] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [activeContextAction, setActiveContextAction] = useState(null)
  const [selectedPillId, setSelectedPillId] = useState(null)

  const applyRateioSummary = (data) => {
    setRateioSummary(data)
    setRateioForm((prev) => ({
      ...prev,
      revenueBaselineMode: data.revenueBaselineMode || 'TARGET_REVENUE',
      revenueBaseline: data.revenueBaseline != null ? String(data.revenueBaseline) : '',
      automaticRateio: data.automaticRateio ?? true,
      manualAllocatedFixedCostPercent:
        data.allocatedFixedCostPercent != null ? String(data.allocatedFixedCostPercent) : ''
    }))
  }

  useEffect(() => {
    let cancelled = false
    const loadSummary = async () => {
      try {
        const data = await operationalService.getFixedCostsSummary()
        if (!cancelled) applyRateioSummary(data)
      } catch (err) {
        console.error('Erro ao carregar resumo de custos fixos:', err)
      }
    }
    loadSummary()
    return () => {
      cancelled = true
    }
  }, [])

  const effectiveFixedPercent = useAutomaticFixedCosts
    ? Number(rateioSummary?.allocatedFixedCostPercent || 0)
    : formData.includeFixedCosts
      ? Number(formData.fixedCostPercent || 0)
      : 0

  const selectedProduct = products.find((product) => product.id === selectedProductId)
  const profileLocked = Boolean(selectedProductId && selectedProduct?.categoryId)

  const explanation = buildSebraeExplanation({
    baseCost: formData.baseCost,
    fixedPercent: effectiveFixedPercent,
    variablePercent: formData.variableCostPercent,
    desiredMargin: formData.desiredMargin,
    taxPercent: selectedProduct?.taxRate ?? 0
  })

  const contextualPill = selectedPillId
    ? getPillById(selectedPillId)
    : selectContextualPill({
        action: activeContextAction,
        discountActive: activeContextAction === 'discount' || Number(discountPercent) > 0,
        fixedCostPercent: effectiveFixedPercent,
        variableCostPercent: formData.variableCostPercent
      })

  const handleSaveRateioConfig = async () => {
    setSavingRateio(true)
    setRateioError('')
    try {
      const baseline = rateioForm.revenueBaseline === '' ? null : Number(rateioForm.revenueBaseline)
      const payload = {
        revenueBaselineMode: rateioForm.revenueBaselineMode,
        automaticRateio: rateioForm.automaticRateio,
        monthlyRevenueTarget:
          rateioForm.revenueBaselineMode === 'TARGET_REVENUE' ? baseline : undefined,
        historicalAverageRevenue:
          rateioForm.revenueBaselineMode === 'HISTORICAL_AVERAGE' ? baseline : undefined,
        manualAllocatedFixedCostPercent: rateioForm.automaticRateio
          ? undefined
          : Number(rateioForm.manualAllocatedFixedCostPercent || 0)
      }
      const data = await operationalService.updateRateioConfig(payload)
      applyRateioSummary(data)
      setShowRateioConfig(false)
    } catch (err) {
      setRateioError(err.response?.data?.message || 'Falha ao salvar a configuração de rateio.')
    } finally {
      setSavingRateio(false)
    }
  }

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await productService.getProducts({ page: 0, size: 100, active: true })
        setProducts(data.content || [])
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    loadProducts()
  }, [])

  const handleProductSelect = (productId) => {
    setSelectedProductId(productId)
    if (!productId) {
      setUseAutomaticFixedCosts(false)
      return
    }

    const product = products.find((item) => item.id === productId)
    if (!product) return

    setFormData((prev) => ({
      ...prev,
      baseCost: String(product.effectiveBaseCost ?? product.baseCost ?? '0'),
      variableCostPercent:
        product.variableCostPercent != null ? String(product.variableCostPercent) : prev.variableCostPercent,
      desiredMargin:
        product.targetProfitMargin != null ? String(product.targetProfitMargin) : prev.desiredMargin
    }))

    if (product.categoryId) {
      setUseAutomaticFixedCosts(true)
    } else {
      setUseAutomaticFixedCosts(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setSelectedPillId(null)
    if (field === 'fixedCostPercent') {
      setActiveContextAction(Number(value) >= 25 ? 'fixed_costs' : 'pricing')
    } else if (field === 'variableCostPercent') {
      setActiveContextAction(Number(value) >= 15 ? 'payment' : 'pricing')
    } else {
      setActiveContextAction('pricing')
    }
  }

  const handleCalculate = async () => {
    setErrorMessage('')
    const baseCostNum = parseFloat(formData.baseCost)
    const includeFixed = useAutomaticFixedCosts ? true : formData.includeFixedCosts
    const fixedNum = effectiveFixedPercent
    const varNum = parseFloat(formData.variableCostPercent || '0')
    const marginNum = parseFloat(formData.desiredMargin || '0')

    if (!selectedProductId && (isNaN(baseCostNum) || baseCostNum <= 0)) {
      setErrorMessage('Informe um custo base válido maior que zero.')
      return
    }

    if (fixedNum + varNum + marginNum >= 100) {
      setErrorMessage('A soma dos custos fixos, variáveis e margem desejada não pode ser igual ou superior a 100%.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        fixedCostPercent: fixedNum,
        variableCostPercent: varNum,
        desiredMargin: marginNum,
        includeFixedCosts: includeFixed,
        useAutomaticFixedCosts
      }

      if (selectedProductId) {
        payload.productId = selectedProductId
      } else {
        payload.baseCost = baseCostNum
      }

      const data = await calculatePricing(payload)
      setPricingResult(data)
      if (data?.minimumSellingPrice) {
        runDiscountSimulation(data.minimumSellingPrice, discountPercent, baseCostNum, fixedNum, varNum)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Falha ao calcular precificação.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const runDiscountSimulation = async (sellingPrice, discount, baseCost, fixedPercent, varPercent) => {
    if (!sellingPrice) return
    try {
      const data = await simulateDiscount({
        sellingPrice: parseFloat(sellingPrice),
        discountPercentage: parseFloat(discount || '0'),
        baseCost: parseFloat(baseCost || '0'),
        fixedCostPercent: parseFloat(fixedPercent || '0'),
        variableCostPercent: parseFloat(varPercent || '0')
      })
      setDiscountResult(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const data = await calculatePricing({
          baseCost: 50.0,
          fixedCostPercent: 10.0,
          variableCostPercent: 15.0,
          desiredMargin: 25.0,
          includeFixedCosts: true
        })
        if (isMounted) {
          setPricingResult(data)
          if (data?.minimumSellingPrice) {
            const discData = await simulateDiscount({
              sellingPrice: parseFloat(data.minimumSellingPrice),
              discountPercentage: 10.0,
              baseCost: 50.0,
              fixedCostPercent: 10.0,
              variableCostPercent: 15.0
            })
            if (isMounted) {
              setDiscountResult(discData)
            }
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [])

  const handleDiscountChange = (newDiscount) => {
    setDiscountPercent(newDiscount)
    setActiveContextAction('discount')
    setSelectedPillId(null)
    if (pricingResult?.minimumSellingPrice) {
      runDiscountSimulation(
        pricingResult.minimumSellingPrice,
        newDiscount,
        formData.baseCost,
        effectiveFixedPercent,
        formData.variableCostPercent
      )
    }
  }

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const percentInputClass =
    'block w-full pl-3 pr-9 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'

  const amountInputClass =
    'block w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="text-center mb-2">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calculator className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Calculadora Markup</h2>
        <p className="text-sm text-slate-500">
          Calcule o preço de venda ideal cobrindo despesas e garantindo sua margem, com base na
          metodologia SEBRAE.
        </p>
      </div>

      <div className="w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Parâmetros de Custo e Margem
            </h3>

            <div>
              <label htmlFor="pricing-product" className="block text-sm font-medium text-slate-700 mb-1.5">
                Produto Cadastrado (opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Package className="w-4 h-4" />
                </div>
                <select
                  id="pricing-product"
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  disabled={loadingProducts}
                  className="block w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 border-slate-200 focus:ring-indigo-100 focus:border-indigo-500"
                >
                  <option value="">
                    {loadingProducts ? 'Carregando...' : 'Selecione um produto...'}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.type === 'SERVICO' ? '🔧' : '📦'} {product.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProductId && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Dados do produto preenchidos automaticamente. Ajuste conforme necessário.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="pricing-baseCost" className="block text-sm font-medium text-slate-700 mb-1.5">
                Custo de Aquisição / Produção Base (R$)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Banknote className="w-4 h-4" />
                </div>
                <input
                  id="pricing-baseCost"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.baseCost}
                  onChange={(e) => handleInputChange('baseCost', e.target.value)}
                  readOnly={!!selectedProductId}
                  className={`${amountInputClass}${selectedProductId ? ' bg-slate-100 text-slate-600' : ''}`}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="toggleFixed" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Despesas Fixas Alocadas (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggleFixed"
                    checked={formData.includeFixedCosts}
                    onChange={(e) => handleInputChange('includeFixedCosts', e.target.checked)}
                    disabled={useAutomaticFixedCosts}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <label htmlFor="toggleFixed" className="text-xs text-slate-500 cursor-pointer">
                    Incluir
                  </label>
                </div>
              </div>

              <label htmlFor="toggleAutomaticFixed" className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-xs font-medium text-slate-600">
                  Usar rateio automático (R_cf do consolidador)
                </span>
                <input
                  type="checkbox"
                  id="toggleAutomaticFixed"
                  checked={useAutomaticFixedCosts}
                  onChange={(e) => setUseAutomaticFixedCosts(e.target.checked)}
                  disabled={profileLocked}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
              </label>

              {formData.includeFixedCosts && (
                useAutomaticFixedCosts ? (
                  <div className="rounded-lg border border-indigo-200 bg-white p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Alíquota de absorção (R_cf)</span>
                      <span className="text-sm font-bold text-indigo-700">
                        {Number(rateioSummary?.allocatedFixedCostPercent || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Custos fixos: {formatCurrency(rateioSummary?.totalFixedCosts)}</span>
                      <span>Faturamento base: {formatCurrency(rateioSummary?.revenueBaseline)}</span>
                    </div>
                    {rateioSummary?.severeRisk && (
                      <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] text-rose-700">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{rateioSummary.riskMessage}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="99"
                      value={formData.fixedCostPercent}
                      onChange={(e) => handleInputChange('fixedCostPercent', e.target.value)}
                      className={`${percentInputClass} bg-white`}
                      placeholder="Ex: 10"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <Percent className="w-4 h-4" />
                    </span>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => setShowRateioConfig((value) => !value)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
                {showRateioConfig ? 'Fechar configuração de rateio' : 'Configurar rateio de custos fixos'}
              </button>

              {showRateioConfig && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                  {rateioError && <p className="text-[11px] text-rose-600">{rateioError}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Modalidade de faturamento base
                      </label>
                      <select
                        value={rateioForm.revenueBaselineMode}
                        onChange={(e) =>
                          setRateioForm((prev) => ({ ...prev, revenueBaselineMode: e.target.value }))
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      >
                        <option value="TARGET_REVENUE">Faturamento estimado (meta)</option>
                        <option value="HISTORICAL_AVERAGE">Média histórica</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        {rateioForm.revenueBaselineMode === 'HISTORICAL_AVERAGE'
                          ? 'Média histórica mensal (R$)'
                          : 'Faturamento mensal estimado (R$)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={rateioForm.revenueBaseline}
                        onChange={(e) =>
                          setRateioForm((prev) => ({ ...prev, revenueBaseline: e.target.value }))
                        }
                        placeholder="Ex: 5000"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rateioForm.automaticRateio}
                      onChange={(e) =>
                        setRateioForm((prev) => ({ ...prev, automaticRateio: e.target.checked }))
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                    />
                    <span className="text-[11px] text-slate-600">
                      Calcular R_cf automaticamente (desmarque para definir manualmente)
                    </span>
                  </label>

                  {!rateioForm.automaticRateio && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Percentual de rateio manual (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="99.99"
                        value={rateioForm.manualAllocatedFixedCostPercent}
                        onChange={(e) =>
                          setRateioForm((prev) => ({
                            ...prev,
                            manualAllocatedFixedCostPercent: e.target.value
                          }))
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveRateioConfig}
                    disabled={savingRateio}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {savingRateio ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Salvar e recalcular</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {profileLocked && (
              <div className="flex items-start gap-2 rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Este item possui um padrão de precificação vinculado. Os parâmetros foram preenchidos
                  automaticamente e ficam bloqueados nesta tela — edite o padrão para alterá-los.
                </span>
              </div>
            )}

            <div>
              <label htmlFor="pricing-variableCostPercent" className="block text-sm font-medium text-slate-700 mb-1.5">
                Despesas Variáveis e Taxas de Venda / Cartão (%)
              </label>
              <div className="relative">
                <input
                  id="pricing-variableCostPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={formData.variableCostPercent}
                  onChange={(e) => handleInputChange('variableCostPercent', e.target.value)}
                  disabled={profileLocked}
                  className={`${percentInputClass}${profileLocked ? ' bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`}
                  placeholder="Ex: 15"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              {profileLocked && (
                <p className="mt-1 text-[11px] text-slate-400">Herdado do padrão do item.</p>
              )}
            </div>

            <div>
              <label htmlFor="pricing-desiredMargin" className="block text-sm font-medium text-slate-700 mb-1.5">
                Margem de Lucro Desejada (%)
              </label>
              <div className="relative">
                <input
                  id="pricing-desiredMargin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={formData.desiredMargin}
                  onChange={(e) => handleInputChange('desiredMargin', e.target.value)}
                  disabled={profileLocked}
                  className={`${percentInputClass}${profileLocked ? ' bg-slate-100 text-slate-600 cursor-not-allowed' : ''}`}
                  placeholder="Ex: 25"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              {profileLocked && (
                <p className="mt-1 text-[11px] text-slate-400">Herdado do padrão do item.</p>
              )}
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{errorMessage}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Calculando...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  <span>Recalcular Preço Ideal</span>
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {pricingResult ? (
              <>
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-emerald-100">
                    <div>
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                        Preço Mínimo de Venda Recomendado
                      </span>
                      <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-1">
                        {formatCurrency(pricingResult.minimumSellingPrice)}
                      </p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-emerald-200 text-center self-start sm:self-auto">
                      <span className="block text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                        Fator Markup
                      </span>
                      <span className="text-xl font-bold text-emerald-700">{pricingResult.markup}x</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Lucro Estimado</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(pricingResult.unitProfit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Margem de Contribuição</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {formatCurrency(pricingResult.contributionMargin)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Margem Bruta</span>
                      <span className="text-sm font-bold text-emerald-700">{pricingResult.grossMargin}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Composição do Preço de Venda
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Custo Base de Aquisição:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(pricingResult.baseCost)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Despesas Fixas Alocadas:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(pricingResult.allocatedFixedCosts)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-600">Despesas Variáveis e Taxas:</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(pricingResult.totalVariableCosts)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700 font-bold">
                      <span>Lucro Líquido Unitário:</span>
                      <span>{formatCurrency(pricingResult.unitProfit)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Simulador de Desconto e Balcão</h4>
                      <p className="text-xs text-slate-500">
                        Veja se conceder desconto ainda mantém sua operação no azul.
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-indigo-700 bg-white px-2.5 py-1 rounded-full border border-indigo-200 shadow-sm">
                      {discountPercent}% OFF
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />

                  {discountResult && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Preço com Desconto</span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(discountResult.discountedPrice)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Lucro Líquido</span>
                          <span className={`text-sm font-bold ${discountResult.viable ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(discountResult.discountedProfit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Margem Resultante</span>
                          <span className={`text-sm font-bold ${discountResult.viable ? 'text-slate-800' : 'text-rose-600'}`}>
                            {discountResult.discountedMargin}%
                          </span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                        !discountResult.viable
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : discountResult.discountedMargin < 10
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}>
                        {discountResult.recommendation}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-1">
                  <EducationalPill
                    pill={contextualPill}
                    allPills={SEBRAE_PILLS}
                    onSelectPill={(id) => setSelectedPillId(id)}
                  />
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                Preencha os parâmetros ao lado para calcular o preço de venda ideal.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowExplanation((value) => !value)}
            className="w-full flex items-center justify-between gap-3 px-6 sm:px-8 py-4 text-left cursor-pointer"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Como o preço de venda é calculado (método SEBRAE)
            </span>
            {showExplanation ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showExplanation && (
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-4">
              <div className="rounded-xl border border-indigo-100 bg-white p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Fórmula simplificada
                </p>
                <code className="block text-xs sm:text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
                  {explanation.formula}
                </code>
                <code className="block text-[11px] text-slate-500 overflow-x-auto whitespace-nowrap">
                  {explanation.markupFormula}
                </code>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>{SEBRAE_PERCENT_BASIS}</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Exemplo com seus valores
                </p>
                {explanation.goldenRuleRespected ? (
                  <>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Se seu custo é <strong>{formatCurrency(explanation.baseCost)}</strong>, com custos fixos de{' '}
                      <strong>{explanation.fixedPercent}%</strong>, variáveis de{' '}
                      <strong>{explanation.variablePercent}%</strong>
                      {explanation.taxPercent > 0 && (
                        <>
                          , tributos de <strong>{explanation.taxPercent}%</strong>
                        </>
                      )}{' '}
                      e lucro desejado de <strong>{explanation.desiredMargin}%</strong>, o preço de venda será{' '}
                      <strong className="text-emerald-700">{formatCurrency(explanation.sellingPrice)}</strong>{' '}
                      (markup de <strong>{explanation.markup}×</strong>).
                    </p>
                    <div className="space-y-1.5 text-xs">
                      {explanation.breakdown
                        .filter((item) => item.key !== 'tax' || item.percent > 0)
                        .map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center justify-between gap-3 py-1 border-b border-slate-100 last:border-0"
                          >
                            <span className="text-slate-600">
                              {item.label}
                              {item.percent != null && <span className="text-slate-400"> ({item.percent}%)</span>}
                            </span>
                            <span className="font-semibold text-slate-800">{formatCurrency(item.value)}</span>
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Com os valores atuais a soma dos percentuais é {explanation.sumPercentages}%. Ajuste os
                      percentuais para que a soma fique abaixo de 100%.
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${
                  explanation.goldenRuleRespected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span className="font-semibold shrink-0">Regra de ouro:</span>
                <span>{SEBRAE_GOLDEN_RULE}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
