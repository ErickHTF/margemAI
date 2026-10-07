import { useState, useEffect } from 'react'
import { Package, Landmark, Wallet } from 'lucide-react'
import PageHeader from './PageHeader'
import CostManager from './CostManager'
import fixedCostService from '../services/fixedCostService'
import variableCostService from '../services/variableCostService'
import productService from '../services/productService'
import { FIXED_COST_CATEGORIES, VARIABLE_COST_CATEGORIES } from '../constants/costCategories'

export default function CostsDashboard() {
  const [activeTab, setActiveTab] = useState('fixed')
  const [products, setProducts] = useState([])

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const firstPage = await productService.getProducts({ page: 0, size: 100 })
        const remainingPages = Array.from(
          { length: Math.max((firstPage.totalPages || 1) - 1, 0) },
          (_, index) => productService.getProducts({ page: index + 1, size: 100 })
        )
        const rest = await Promise.all(remainingPages)
        if (!cancelled) {
          setProducts([
            ...(firstPage.content || []),
            ...rest.flatMap((page) => page.content || [])
          ])
        }
      } catch {
        if (!cancelled) setProducts([])
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const tabs = [
    {
      key: 'fixed',
      label: 'Custos Fixos',
      Icon: Landmark
    },
    {
      key: 'variable',
      label: 'Custos Variáveis',
      Icon: Package
    }
  ]

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          Icon={Wallet}
          title="Gestão de Custos"
          description="Registre despesas fixas e custos variáveis, vinculando matéria-prima e embalagem a cada produto."
        />
      </div>

      <div className="w-full max-w-3xl mx-auto mb-6">
        <div className="bg-white/70 backdrop-blur rounded-2xl p-1.5 border border-slate-200 grid grid-cols-2 gap-1 shadow-sm">
          {tabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'fixed' && (
        <CostManager
          key="fixed"
          kind="fixed"
          service={fixedCostService}
          categories={FIXED_COST_CATEGORIES}
        />
      )}
      {activeTab === 'variable' && (
        <CostManager
          key="variable"
          kind="variable"
          service={variableCostService}
          categories={VARIABLE_COST_CATEGORIES}
          products={products}
        />
      )}
    </div>
  )
}
