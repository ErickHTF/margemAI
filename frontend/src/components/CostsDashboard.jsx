import useDraft from '../hooks/useDraft'
import { useState, useEffect } from 'react'
import { Package, Landmark, Wallet } from 'lucide-react'
import PageHeader from './PageHeader'
import { SegmentedControl } from './ui'
import CostManager from './CostManager'
import fixedCostService from '../services/fixedCostService'
import variableCostService from '../services/variableCostService'
import productService from '../services/productService'
import { FIXED_COST_CATEGORIES, VARIABLE_COST_CATEGORIES } from '../constants/costCategories'

export default function CostsDashboard() {
  const { guard } = useDraft(null)
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
    <div className="w-full space-y-6">
      <PageHeader
        Icon={Wallet}
        title="Gestão de Custos"
        description="Registre despesas fixas e custos variáveis, vinculando matéria-prima e embalagem a cada produto."
      />

      <SegmentedControl
        data-tour="costs-tabs"
        size="md"
        label="Tipo de custo"
        options={tabs.map(({ key, label, Icon }) => ({ value: key, label, Icon }))}
        value={activeTab}
        onChange={(key) => guard(() => setActiveTab(key))}
      />

      <div data-tour="costs-content">
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
    </div>
  )
}
