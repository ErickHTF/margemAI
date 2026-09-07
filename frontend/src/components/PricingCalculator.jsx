import { useState, useEffect } from 'react'
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
  const [simulatingDiscount, setSimulatingDiscount] = useState(false)

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
    setSimulatingDiscount(true)
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
    } finally {
      setSimulatingDiscount(false)
    }
  }

  useEffect(() => {
    handleCalculate()
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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 mb-2">
                Metodologia SEBRAE
              </span>
              <h2 className="text-xl font-bold">Motor de Precificação por Markup</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Calcule o preço de venda ideal com cobertura de despesas e margem garantida.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-2xl font-black tracking-tight block">Margem.AI</span>
              <span className="text-xs text-emerald-200">Assistente Financeiro MEI</span>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              Parâmetros de Custo e Margem
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Custo de Aquisição / Produção Base (R$)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.baseCost}
                  onChange={(e) => handleInputChange('baseCost', e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">
                  Despesas Fixas Alocadas (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="toggleFixed"
                    checked={formData.includeFixedCosts}
                    onChange={(e) => handleInputChange('includeFixedCosts', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                  />
                  <label htmlFor="toggleFixed" className="text-xs text-slate-500 cursor-pointer">
                    Incluir
                  </label>
                </div>
              </div>
              {formData.includeFixedCosts && (
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99"
                    value={formData.fixedCostPercent}
                    onChange={(e) => handleInputChange('fixedCostPercent', e.target.value)}
                    className="block w-full pr-8 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Ex: 10"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 text-sm">
                    %
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Despesas Variáveis e Taxas de Venda / Cartão (%)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={formData.variableCostPercent}
                  onChange={(e) => handleInputChange('variableCostPercent', e.target.value)}
                  className="block w-full pr-8 pl-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition"
                  placeholder="Ex: 15"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500 text-sm">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Margem de Lucro Desejada (%)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="99"
                  value={formData.desiredMargin}
                  onChange={(e) => handleInputChange('desiredMargin', e.target.value)}
                  className="block w-full pr-8 pl-3 py-2.5 bg-emerald-50/60 border border-emerald-300 rounded-lg text-emerald-950 font-semibold text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white transition"
                  placeholder="Ex: 25"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-700 font-bold text-sm">
                  %
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow transition disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Recalcular Preço Ideal'}
            </button>
          </div>

          <div className="lg:col-span-7 space-y-6">
            {pricingResult ? (
              <>
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                        Preço Mínimo de Venda Recomendado
                      </span>
                      <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                        {formatCurrency(pricingResult.minimumSellingPrice)}
                      </div>
                    </div>
                    <div className="bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-700 self-start sm:self-auto">
                      <span className="text-xs text-slate-400 block">Fator Markup</span>
                      <span className="text-base font-bold text-emerald-400">
                        {pricingResult.markup}x
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                    <div>
                      <span className="text-slate-400 block">Lucro Estimado</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(pricingResult.unitProfit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Margem de Contribuição</span>
                      <span className="text-sm font-bold text-teal-300">
                        {formatCurrency(pricingResult.contributionMargin)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Margem Bruta</span>
                      <span className="text-sm font-bold text-slate-200">
                        {pricingResult.grossMargin}%
                      </span>
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

                <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Simulador de Desconto e Balcão
                      </h4>
                      <p className="text-xs text-slate-500">
                        Veja se conceder desconto ainda mantém sua operação no azul.
                      </p>
                    </div>
                    <span className="text-sm font-extrabold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
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
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
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
                          <span className={`text-sm font-bold ${discountResult.viable ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(discountResult.discountedProfit)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Margem Resultante</span>
                          <span className={`text-sm font-bold ${discountResult.viable ? 'text-slate-800' : 'text-red-600'}`}>
                            {discountResult.discountedMargin}%
                          </span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                        !discountResult.viable
                          ? 'bg-red-50 text-red-800 border border-red-200'
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
