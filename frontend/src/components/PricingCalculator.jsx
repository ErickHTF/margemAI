import { useState, useEffect } from 'react'
import { Calculator, Loader2, AlertCircle, Percent, Banknote } from 'lucide-react'
import { calculatePricing, simulateDiscount } from '../services/pricingService'

export default function PricingCalculator() {
  const [formData, setFormData] = useState({
    baseCost: '50.00',
    fixedCostPercent: '10.00',
    variableCostPercent: '15.00',
    desiredMargin: '25.00',
    includeFixedCosts: true
  })

  const [pricingResult, setPricingResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [discountPercent, setDiscountPercent] = useState('10')
  const [discountResult, setDiscountResult] = useState(null)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleCalculate = async () => {
    setErrorMessage('')
    const baseCostNum = parseFloat(formData.baseCost)
    const fixedNum = formData.includeFixedCosts ? parseFloat(formData.fixedCostPercent || '0') : 0
    const varNum = parseFloat(formData.variableCostPercent || '0')
    const marginNum = parseFloat(formData.desiredMargin || '0')

    if (isNaN(baseCostNum) || baseCostNum <= 0) {
      setErrorMessage('Informe um custo base válido maior que zero.')
      return
    }

    if (fixedNum + varNum + marginNum >= 100) {
      setErrorMessage('A soma dos custos fixos, variáveis e margem desejada não pode ser igual ou superior a 100%.')
      return
    }

    setLoading(true)
    try {
      const data = await calculatePricing({
        baseCost: baseCostNum,
        fixedCostPercent: fixedNum,
        variableCostPercent: varNum,
        desiredMargin: marginNum,
        includeFixedCosts: formData.includeFixedCosts
      })
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
    if (pricingResult?.minimumSellingPrice) {
      runDiscountSimulation(
        pricingResult.minimumSellingPrice,
        newDiscount,
        formData.baseCost,
        formData.includeFixedCosts ? formData.fixedCostPercent : '0',
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
                  className={amountInputClass}
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
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <label htmlFor="toggleFixed" className="text-xs text-slate-500 cursor-pointer">
                    Incluir
                  </label>
                </div>
              </div>
              {formData.includeFixedCosts && (
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
              )}
            </div>

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
                  className={percentInputClass}
                  placeholder="Ex: 15"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
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
                  className={percentInputClass}
                  placeholder="Ex: 25"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
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
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                Preencha os parâmetros ao lado para calcular o preço de venda ideal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
