import useDraft from '../hooks/useDraft'
import { useState, useEffect, useRef } from 'react'
import MarginAvoidedNotice from './MarginAvoidedNotice'
import { evaluateMarginDecisionTransition } from '../utils/marginAvoidedTip'
import {
  Calculator,
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
  ChevronUp,
  Target
} from 'lucide-react'
import PageHeader from './PageHeader'
import { Badge, Button, Card, Checkbox, EmptyState, Field, Input, Notice, Select } from './ui'
import PricingResultExplanation from './PricingResultExplanation'
import { buildPricingExplanation } from '../utils/pricingExplanation'
import { calculatePricing, simulateDiscount, calculateBreakEven } from '../services/pricingService'
import { productService } from '../services/productService'
import { operationalService } from '../services/operationalService'
import {
  breakEvenUnitVariableCost,
  buildSebraeExplanation,
  SEBRAE_GOLDEN_RULE,
  SEBRAE_PERCENT_BASIS
} from '../utils/sebraeMethod'
import TipButton from './TipButton'
import usePaymentFees from '../hooks/usePaymentFees'
import { formatFeePercent } from '../utils/paymentFees'
import { PAYMENT_METHODS } from '../constants/sales'
import { SEBRAE_PILLS, getPillById, selectContextualPill } from '../data/sebraePills'

export default function PricingCalculator({ onNavigate }) {
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
  const [resultExplanation, setResultExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [breakEvenResult, setBreakEvenResult] = useState(null)
  const [breakEvenError, setBreakEvenError] = useState('')

  const [discountPercent, setDiscountPercent] = useState('10')
  const [discountResult, setDiscountResult] = useState(null)
  const [marginAvoidedData, setMarginAvoidedData] = useState(null)
  const [dismissedSignatures, setDismissedSignatures] = useState(() => new Set())
  const previousScenarioRef = useRef(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [activeContextAction, setActiveContextAction] = useState(null)
  const [selectedPillId, setSelectedPillId] = useState(null)

  const { getFee, error: feesError } = usePaymentFees()
  const [useConfiguredFee, setUseConfiguredFee] = useState(false)
  const [feeMethod, setFeeMethod] = useState('CREDITO_A_VISTA')
  const [feeInstallments, setFeeInstallments] = useState(2)

  useDraft({ formData, selectedProductId, useAutomaticFixedCosts, discountPercent, useConfiguredFee, feeMethod, feeInstallments })
  const [savedRateioForm, setSavedRateioForm] = useState(rateioForm)
  const { dirty: rateioDirty } = useDraft(rateioForm, savedRateioForm)

  const applyRateioSummary = (data) => {
    setRateioSummary(data)
    const next = {
      revenueBaselineMode: data.revenueBaselineMode || 'TARGET_REVENUE',
      revenueBaseline: data.revenueBaseline != null ? String(data.revenueBaseline) : '',
      automaticRateio: data.automaticRateio ?? true,
      manualAllocatedFixedCostPercent: data.allocatedFixedCostPercent != null ? String(data.allocatedFixedCostPercent) : ''
    }
    setRateioForm(next)
    setSavedRateioForm(next)
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

  const configuredFee = getFee(feeMethod, feeInstallments)
  const paymentFeePercent = useConfiguredFee ? configuredFee.mdrFeePercent : 0
  const effectiveVariablePercent =
    Math.round((Number(formData.variableCostPercent || 0) + paymentFeePercent) * 100) / 100

  const selectedProduct = products.find((product) => product.id === selectedProductId)
  const profileLocked = Boolean(selectedProductId && selectedProduct?.categoryId)

  const explanation = buildSebraeExplanation({
    baseCost: formData.baseCost,
    fixedPercent: effectiveFixedPercent,
    variablePercent: effectiveVariablePercent,
    desiredMargin: formData.desiredMargin,
    taxPercent: selectedProduct?.taxRate ?? 0
  })

  const contextualPill = selectedPillId
    ? getPillById(selectedPillId)
    : selectContextualPill({
        action: activeContextAction,
        discountActive: activeContextAction === 'discount',
        fixedCostPercent: effectiveFixedPercent,
        variableCostPercent: effectiveVariablePercent
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
    setMarginAvoidedData(null)
    previousScenarioRef.current = null
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
    if (field === 'baseCost') {
      setMarginAvoidedData(null)
      previousScenarioRef.current = null
    }
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
    const varNum = effectiveVariablePercent
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
      setResultExplanation(buildPricingExplanation(data, { paymentFeePercent, fixedFeeAmount: configuredFee.fixedFeeAmount, useConfiguredFee }))
      runBreakEven(data)
      if (data?.minimumSellingPrice) {
        runDiscountSimulation(data.minimumSellingPrice, discountPercent, data.baseCost, fixedNum, varNum)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Falha ao calcular precificação.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  const fetchBreakEven = async (pricingData) => {
    if (!pricingData?.minimumSellingPrice) return null
    return calculateBreakEven({
      sellingPrice: Number(pricingData.minimumSellingPrice),
      unitVariableCost: breakEvenUnitVariableCost(pricingData)
    })
  }

  const runBreakEven = async (pricingData) => {
    setBreakEvenError('')
    try {
      setBreakEvenResult(await fetchBreakEven(pricingData))
    } catch (err) {
      setBreakEvenResult(null)
      setBreakEvenError(err.response?.data?.message || 'Não foi possível calcular o ponto de equilíbrio.')
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

      const currentScenario = {
        productId: selectedProductId || null,
        baseCost,
        discountPercentage: parseFloat(discount || '0'),
        discountedPrice: data.discountedPrice,
        discountedProfit: data.discountedProfit,
        discountedMargin: data.discountedMargin,
        viable: data.viable,
        maxDiscountPercentage: selectedProduct?.maxDiscountAllowed ?? selectedProduct?.maxDiscountPercentage
      }

      if (previousScenarioRef.current) {
        const transition = evaluateMarginDecisionTransition(
          previousScenarioRef.current,
          currentScenario,
          dismissedSignatures
        )
        if (transition) {
          setMarginAvoidedData(transition)
        } else if (!data.viable || Number(data.discountedProfit) <= 0) {
          setMarginAvoidedData(null)
        }
      }
      previousScenarioRef.current = currentScenario
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
          setResultExplanation(buildPricingExplanation(data))
          fetchBreakEven(data)
            .then((breakEven) => {
              if (isMounted) setBreakEvenResult(breakEven)
            })
            .catch((err) => {
              if (isMounted) {
                setBreakEvenError(
                  err.response?.data?.message || 'Não foi possível calcular o ponto de equilíbrio.'
                )
              }
            })
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
              previousScenarioRef.current = {
                productId: null,
                baseCost: 50.0,
                discountPercentage: 10.0,
                discountedPrice: discData.discountedPrice,
                discountedProfit: discData.discountedProfit,
                discountedMargin: discData.discountedMargin,
                viable: discData.viable
              }
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

  const handleDismissMarginAvoided = () => {
    if (marginAvoidedData?.contextKey) {
      setDismissedSignatures((prev) => new Set([...prev, marginAvoidedData.contextKey]))
    }
    setMarginAvoidedData(null)
  }

  const handleDiscountChange = (newDiscount) => {
    setDiscountPercent(newDiscount)
    setActiveContextAction('discount')
    setSelectedPillId(null)
    if (pricingResult?.minimumSellingPrice) {
      runDiscountSimulation(
        pricingResult.minimumSellingPrice,
        newDiscount,
        pricingResult.baseCost,
        resultExplanation?.rows.find((row) => row.key === 'fixed')?.percent ?? 0,
        resultExplanation?.rows.filter((row) => row.key === 'variable' || row.key === 'payment').reduce((total, row) => total + row.percent, 0) ?? 0
      )
    }
  }

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }


  const lockedHint = (
    <>
      Herdado do padrão do item.{' '}
      {onNavigate && (
        <Button variant="link" size="sm" className="underline" onClick={() => onNavigate('categories')}>
          Conferir padrões de preço
        </Button>
      )}
    </>
  )
  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={Calculator}
        title="Calculadora Markup"
        tip={
          <TipButton
            pill={contextualPill}
            allPills={SEBRAE_PILLS}
            onSelectPill={(id) => setSelectedPillId(id)}
          />
        }
        description="Calcule o preço de venda ideal cobrindo despesas e garantindo sua margem, com base na metodologia SEBRAE."
      />

      <Card padding="none" className="w-full overflow-hidden">
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div data-tour="pricing-parameters" className="lg:col-span-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Parâmetros de Custo e Margem
            </h3>

            <Field
              label="Produto Cadastrado (opcional)"
              hint={selectedProductId ? 'Dados do produto preenchidos automaticamente. Ajuste conforme necessário.' : undefined}
            >
              <Select
                data-tour="pricing-product"
                id="pricing-product"
                Icon={Package}
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                disabled={loadingProducts}
              >
                <option value="">
                  {loadingProducts ? 'Carregando...' : 'Selecione um produto...'}
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.type === 'SERVICO' ? '🔧' : '📦'} {product.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Custo de Aquisição / Produção Base (R$)">
              <Input
                id="pricing-baseCost"
                type="number"
                step="0.01"
                min="0.01"
                Icon={Banknote}
                value={formData.baseCost}
                onChange={(e) => handleInputChange('baseCost', e.target.value)}
                readOnly={!!selectedProductId}
                placeholder="0,00"
              />
            </Field>

            {onNavigate && <p className="text-xs text-slate-500">O rateio usa os custos fixos do negócio. <Button variant="link" size="sm" className="underline" onClick={() => onNavigate('costs')}>Conferir custos cadastrados</Button></p>}
            <Card tone="muted" inset padding="sm" className="space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="toggleFixed" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Despesas Fixas Alocadas (%)
                </label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="toggleFixed"
                    checked={formData.includeFixedCosts}
                    onChange={(e) => handleInputChange('includeFixedCosts', e.target.checked)}
                    disabled={useAutomaticFixedCosts}
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
                <Checkbox
                  id="toggleAutomaticFixed"
                  checked={useAutomaticFixedCosts}
                  onChange={(e) => setUseAutomaticFixedCosts(e.target.checked)}
                  disabled={profileLocked}
                />
              </label>

              {formData.includeFixedCosts && (
                useAutomaticFixedCosts ? (
                  <Card inset padding="none" className="p-3 space-y-2">
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
                      <Notice tone="rose" size="sm" Icon={AlertTriangle} className="text-[11px]">
                        {rateioSummary.riskMessage}
                      </Notice>
                    )}
                  </Card>
                ) : (
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    TrailingIcon={Percent}
                    aria-label="Despesas fixas alocadas (%)"
                    value={formData.fixedCostPercent}
                    onChange={(e) => handleInputChange('fixedCostPercent', e.target.value)}
                    placeholder="Ex: 10"
                  />
                )
              )}

              <Button
                variant="link"
                size="sm"
                Icon={Settings2}
                aria-expanded={showRateioConfig}
                onClick={() => setShowRateioConfig((value) => !value)}
              >
                {showRateioConfig ? 'Fechar configuração de rateio' : 'Configurar rateio de custos fixos'}
              </Button>

              {showRateioConfig && (
                <Card inset padding="none" className="p-3 space-y-3">
                  {rateioError && <p role="alert" className="text-[11px] text-rose-600">{rateioError}</p>}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field size="sm" label="Modalidade de faturamento base">
                      <Select
                        size="sm"
                        value={rateioForm.revenueBaselineMode}
                        onChange={(e) =>
                          setRateioForm((prev) => ({ ...prev, revenueBaselineMode: e.target.value }))
                        }
                      >
                        <option value="TARGET_REVENUE">Faturamento estimado (meta)</option>
                        <option value="HISTORICAL_AVERAGE">Média histórica</option>
                      </Select>
                    </Field>
                    <Field
                      size="sm"
                      label={rateioForm.revenueBaselineMode === 'HISTORICAL_AVERAGE'
                        ? 'Média histórica mensal (R$)'
                        : 'Faturamento mensal estimado (R$)'}
                    >
                      <Input
                        size="sm"
                        type="number"
                        step="0.01"
                        min="0"
                        value={rateioForm.revenueBaseline}
                        onChange={(e) =>
                          setRateioForm((prev) => ({ ...prev, revenueBaseline: e.target.value }))
                        }
                        placeholder="Ex: 5000"
                      />
                    </Field>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={rateioForm.automaticRateio}
                      onChange={(e) =>
                        setRateioForm((prev) => ({ ...prev, automaticRateio: e.target.checked }))
                      }
                    />
                    <span className="text-[11px] text-slate-600">
                      Calcular R_cf automaticamente (desmarque para definir manualmente)
                    </span>
                  </label>

                  {!rateioForm.automaticRateio && (
                    <Field size="sm" label="Percentual de rateio manual (%)">
                      <Input
                        size="sm"
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
                      />
                    </Field>
                  )}

                  <Button
                    size="sm"
                    fullWidth
                    Icon={RefreshCw}
                    loading={savingRateio}
                    onClick={handleSaveRateioConfig}
                    disabled={!rateioDirty}
                  >
                    {savingRateio ? 'Salvando...' : 'Salvar e recalcular'}
                  </Button>
                </Card>
              )}
            </Card>

            {profileLocked && (
              <Notice tone="indigo" size="sm" Icon={AlertCircle} role="note">
                Este item possui um padrão de precificação vinculado. Os parâmetros foram preenchidos
                automaticamente e ficam bloqueados nesta tela — edite o padrão para alterá-los.
              </Notice>
            )}

            <div>
              <Field
                label={useConfiguredFee ? 'Outras Despesas Variáveis (%)' : 'Despesas Variáveis e Taxas de Venda / Cartão (%)'}
                hint={profileLocked ? lockedHint : undefined}
              >
                <Input
                  id="pricing-variableCostPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  TrailingIcon={Percent}
                  value={formData.variableCostPercent}
                  onChange={(e) => handleInputChange('variableCostPercent', e.target.value)}
                  disabled={profileLocked}
                  placeholder="Ex: 15"
                />
              </Field>

              <Card tone="muted" inset padding="none" className="mt-3 p-3 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <Checkbox
                    checked={useConfiguredFee}
                    onChange={(e) => {
                      setUseConfiguredFee(e.target.checked)
                      setActiveContextAction('payment')
                      setSelectedPillId(null)
                    }}
                  />
                  Incluir taxa de pagamento configurada
                </label>

                {useConfiguredFee && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        size="sm"
                        className="flex-1 min-w-[10rem]"
                        aria-label="Forma de pagamento"
                        value={feeMethod}
                        onChange={(e) => setFeeMethod(e.target.value)}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                      {feeMethod === 'CREDITO_PARCELADO' && (
                        <Select
                          size="sm"
                          className="w-auto"
                          aria-label="Número de parcelas"
                          value={feeInstallments}
                          onChange={(e) => setFeeInstallments(parseInt(e.target.value, 10))}
                        >
                          {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <option key={n} value={n}>
                              {n}x
                            </option>
                          ))}
                        </Select>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Taxa aplicada: <strong className="text-slate-900">{formatFeePercent(configuredFee.mdrFeePercent)}</strong>
                      {' · '}total de despesas variáveis:{' '}
                      <strong className="text-slate-900">{formatFeePercent(effectiveVariablePercent)}</strong>
                    </p>
                    {configuredFee.fixedFeeAmount > 0 && (
                      <p className="text-[11px] text-slate-500">
                        A tarifa fixa de {formatCurrency(configuredFee.fixedFeeAmount)} por venda não entra no markup, que é percentual.
                      </p>
                    )}
                    <p className="text-[11px] text-amber-700">
                      Não inclua a taxa do cartão no campo acima para não contá-la duas vezes.
                    </p>
                    {feesError && <p className="text-[11px] text-amber-700">{feesError}</p>}
                  </>
                )}
              </Card>
            </div>

            {onNavigate && <p className="text-xs text-slate-500">A taxa aplicada vem da matriz de pagamento. <Button variant="link" size="sm" className="underline" onClick={() => onNavigate('payment-methods')}>Conferir taxas de pagamento</Button></p>}
            <Field label="Margem de Lucro Desejada (%)" hint={profileLocked ? lockedHint : undefined}>
              <Input
                id="pricing-desiredMargin"
                type="number"
                step="0.1"
                min="0"
                max="99"
                TrailingIcon={Percent}
                value={formData.desiredMargin}
                onChange={(e) => handleInputChange('desiredMargin', e.target.value)}
                disabled={profileLocked}
                placeholder="Ex: 25"
              />
            </Field>

            {errorMessage && (
              <Notice tone="rose">
                <p className="font-medium">{errorMessage}</p>
              </Notice>
            )}

            <Button fullWidth Icon={Calculator} loading={loading} onClick={handleCalculate}>
              {loading ? 'Calculando...' : 'Recalcular Preço Ideal'}
            </Button>
          </div>

          <div data-tour="pricing-results" className="lg:col-span-7 space-y-6">
            {pricingResult ? (
              <>
                <Card tone="emerald" inset>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-emerald-100">
                    <div>
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                        Preço Mínimo de Venda Recomendado
                      </span>
                      <p className="text-2xl sm:text-3xl font-extrabold text-emerald-800 mt-1">
                        {formatCurrency(pricingResult.minimumSellingPrice)}
                      </p>
                    </div>
                    <Card inset padding="none" className="px-4 py-2 text-center self-start sm:self-auto">
                      <span className="block text-[11px] uppercase tracking-wide text-slate-500 font-medium">
                        Fator Markup
                      </span>
                      <span className="text-xl font-bold text-emerald-700">{pricingResult.markup}x</span>
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">{Number(pricingResult.estimatedTaxes) > 0 ? 'Lucro estimado antes dos tributos' : 'Lucro Estimado'}</span>
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
                </Card>

                <PricingResultExplanation explanation={resultExplanation} />

                <Card inset className="space-y-4">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Target className="w-4 h-4 text-indigo-600" />
                      Ponto de Equilíbrio (mensal)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Quanto vender por mês, a este preço, para cobrir seus custos fixos.
                    </p>
                  </div>

                  {breakEvenError ? (
                    <Notice tone="rose" size="sm">{breakEvenError}</Notice>
                  ) : breakEvenResult ? (
                    <>
                      {breakEvenResult.viable && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Card tone="indigo" inset padding="none" className="p-3">
                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                              Quantidade por mês
                            </span>
                            <span className="text-xl font-extrabold text-indigo-900">
                              {Number(breakEvenResult.breakEvenQuantity).toLocaleString('pt-BR')}{' '}
                              <span className="text-xs font-semibold">
                                {Number(breakEvenResult.breakEvenQuantity) === 1 ? 'unidade' : 'unidades'}
                              </span>
                            </span>
                          </Card>
                          <Card tone="indigo" inset padding="none" className="p-3">
                            <span className="block text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                              Faturamento por mês
                            </span>
                            <span className="text-xl font-extrabold text-indigo-900">
                              {formatCurrency(breakEvenResult.breakEvenRevenue)}
                            </span>
                          </Card>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Custos fixos mensais</span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(breakEvenResult.totalFixedCosts)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Custo variável unitário</span>
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(breakEvenResult.unitVariableCost)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Margem de contribuição unitária</span>
                          <span
                            className={`text-sm font-bold ${
                              breakEvenResult.viable ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {formatCurrency(breakEvenResult.unitContributionMargin)} (
                            {Number(breakEvenResult.contributionMarginRatio).toLocaleString('pt-BR')}%)
                          </span>
                        </div>
                      </div>

                      <Notice tone={breakEvenResult.viable ? 'sky' : 'rose'} size="sm" Icon={null} role="status">
                        {breakEvenResult.recommendation}
                      </Notice>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400">Calcule o preço para ver o ponto de equilíbrio.</p>
                  )}
                </Card>

                <Card tone="muted" inset className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Simulador de Desconto e Balcão</h4>
                      <p className="text-xs text-slate-500">
                        Veja se conceder desconto ainda mantém sua operação no azul.
                      </p>
                    </div>
                    <Badge tone="indigo" className="shrink-0">
                      {discountPercent}% OFF
                    </Badge>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={discountPercent}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    aria-label="Percentual de desconto"
                    className="w-full cursor-pointer accent-indigo-600"
                  />

                  {marginAvoidedData && (
                    <MarginAvoidedNotice
                      avoidedData={marginAvoidedData}
                      onDismiss={handleDismissMarginAvoided}
                    />
                  )}

                  {discountResult && (
                    <Card inset padding="sm" className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
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

                      <Notice
                        size="sm"
                        role="status"
                        tone={!discountResult.viable ? 'rose' : discountResult.discountedMargin < 10 ? 'amber' : 'emerald'}
                      >
                        {discountResult.recommendation}
                      </Notice>
                    </Card>
                  )}
                </Card>
              </>
            ) : (
              <Card tone="muted" inset className="h-full flex items-center justify-center border-dashed">
                <EmptyState Icon={Calculator} description="Preencha os parâmetros ao lado para calcular o preço de venda ideal." />
              </Card>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            aria-expanded={showExplanation}
            aria-controls="pricing-method-preview"
            onClick={() => setShowExplanation((value) => !value)}
            aria-expanded={showExplanation}
            className="w-full flex items-center justify-between gap-3 px-6 sm:px-8 py-4 text-left cursor-pointer"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Prévia dos parâmetros atuais (método SEBRAE)
            </span>
            {showExplanation ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showExplanation && (
            <div id="pricing-method-preview" className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-4">
              <p className="text-xs text-slate-500">Esta prévia acompanha as entradas atuais. O resultado acima só muda ao recalcular.</p>
              <Card inset padding="sm" className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Fórmula simplificada
                </p>
                <code className="block text-xs sm:text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 overflow-x-auto whitespace-nowrap">
                  {explanation.formula}
                </code>
                <code className="block text-[11px] text-slate-500 overflow-x-auto whitespace-nowrap">
                  {explanation.markupFormula}
                </code>
              </Card>

              <Notice tone="amber" size="sm" role="note">
                {SEBRAE_PERCENT_BASIS}
              </Notice>

              <Card inset padding="sm" className="space-y-3">
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
              </Card>

              <Notice tone={explanation.goldenRuleRespected ? 'emerald' : 'rose'} size="sm" role="note">
                <span className="font-semibold">Regra de ouro:</span> {SEBRAE_GOLDEN_RULE}
              </Notice>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
