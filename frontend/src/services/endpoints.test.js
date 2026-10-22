import { describe, it, expect, vi, beforeEach } from 'vitest'
import api from './api'
import { accountService } from './accountService'
import alertService from './alertService'
import { obligationService } from './obligationService'
import { categoryService } from './categoryService'
import dashboardService from './dashboardService'
import fixedCostService from './fixedCostService'
import { paymentMethodService } from './paymentMethodService'
import { calculatePricing, simulateDiscount, calculateBreakEven } from './pricingService'
import { productService } from './productService'
import profileService from './profileService'
import { saleService } from './saleService'
import { getSegments } from './segmentService'
import variableCostService from './variableCostService'
import { authService } from '../security/services/authService'

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }
}))

const VERBS = ['get', 'post', 'put', 'patch', 'delete']

// Contrato HTTP de cada cliente: verbo, URL (com path/query params) e corpo exatos.
// `returns: 'data'` exige que a função devolva o próprio `response.data` (sentinela único);
// `returns: 'void'` exige que não devolva nada.
const payload = { name: 'Camiseta', sellingPrice: '50.00' }
const filters = { type: 'PRODUTO', page: 0, size: 10 }

const CASES = [
  // Contas empresariais
  { label: 'accountService.list', call: () => accountService.list(), verb: 'get', args: ['/accounts'] },
  { label: 'accountService.history filtra pela conta', call: () => accountService.history('conta-1'), verb: 'get', args: ['/accounts/movements', { params: { accountId: 'conta-1' } }] },
  { label: 'accountService.history sem conta não envia filtro', call: () => accountService.history(''), verb: 'get', args: ['/accounts/movements', { params: { accountId: undefined } }] },
  { label: 'accountService.create', call: () => accountService.create(payload), verb: 'post', args: ['/accounts', payload] },
  { label: 'accountService.movement', call: () => accountService.movement(payload), verb: 'post', args: ['/accounts/movements', payload] },
  // Alertas, obrigações MEI e dashboard
  { label: 'alertService.getMeiCapStatus', call: () => alertService.getMeiCapStatus({ accumulatedRevenue: 50000 }), verb: 'get', args: ['/alerts/mei-cap', { params: { accumulatedRevenue: 50000 } }] },
  { label: 'obligationService.getSchedule', call: () => obligationService.getSchedule({ year: 2026 }), verb: 'get', args: ['/obligations', { params: { year: 2026 } }] },
  { label: 'obligationService.updateStatus', call: () => obligationService.updateStatus('ob-1', payload), verb: 'patch', args: ['/obligations/ob-1/status', payload] },
  { label: 'obligationService.updateReminders', call: () => obligationService.updateReminders({ reminderDaysBefore: 7, year: 2026 }), verb: 'patch', args: ['/obligations/reminders', { reminderDaysBefore: 7, year: 2026 }] },
  { label: 'dashboardService.getMonthlyFlow', call: () => dashboardService.getMonthlyFlow({ months: 6 }), verb: 'get', args: ['/dashboard/monthly-flow', { params: { months: 6 } }] },
  { label: 'dashboardService.getMonthlyFlow sem filtros', call: () => dashboardService.getMonthlyFlow(), verb: 'get', args: ['/dashboard/monthly-flow', { params: {} }] },
  // Categorias
  { label: 'categoryService.getCategories', call: () => categoryService.getCategories(filters), verb: 'get', args: ['/categories', { params: filters }] },
  { label: 'categoryService.getCategory', call: () => categoryService.getCategory('1'), verb: 'get', args: ['/categories/1'] },
  { label: 'categoryService.createCategory', call: () => categoryService.createCategory(payload), verb: 'post', args: ['/categories', payload] },
  { label: 'categoryService.updateCategory', call: () => categoryService.updateCategory('1', payload), verb: 'put', args: ['/categories/1', payload] },
  { label: 'categoryService.patchCategoryStatus', call: () => categoryService.patchCategoryStatus('1', false), verb: 'patch', args: ['/categories/1/status', { active: false }] },
  { label: 'categoryService.deleteCategory', call: () => categoryService.deleteCategory('1'), verb: 'delete', args: ['/categories/1'], returns: 'void' },
  { label: 'categoryService.revalidatePrices', call: () => categoryService.revalidatePrices('1'), verb: 'post', args: ['/categories/1/revalidate-prices'] },
  // Custos fixos e variáveis
  { label: 'fixedCostService.list', call: () => fixedCostService.list({ active: true }), verb: 'get', args: ['/costs/fixed', { params: { active: true } }] },
  { label: 'fixedCostService.get', call: () => fixedCostService.get('7'), verb: 'get', args: ['/costs/fixed/7'] },
  { label: 'fixedCostService.create', call: () => fixedCostService.create(payload), verb: 'post', args: ['/costs/fixed', payload] },
  { label: 'fixedCostService.update', call: () => fixedCostService.update('7', payload), verb: 'put', args: ['/costs/fixed/7', payload] },
  { label: 'fixedCostService.patch', call: () => fixedCostService.patch('7', payload), verb: 'patch', args: ['/costs/fixed/7', payload] },
  { label: 'fixedCostService.remove', call: () => fixedCostService.remove('7'), verb: 'delete', args: ['/costs/fixed/7'] },
  { label: 'variableCostService.list', call: () => variableCostService.list({ active: true }), verb: 'get', args: ['/costs/variable', { params: { active: true } }] },
  { label: 'variableCostService.get', call: () => variableCostService.get('8'), verb: 'get', args: ['/costs/variable/8'] },
  { label: 'variableCostService.create', call: () => variableCostService.create(payload), verb: 'post', args: ['/costs/variable', payload] },
  { label: 'variableCostService.update', call: () => variableCostService.update('8', payload), verb: 'put', args: ['/costs/variable/8', payload] },
  { label: 'variableCostService.patch', call: () => variableCostService.patch('8', payload), verb: 'patch', args: ['/costs/variable/8', payload] },
  { label: 'variableCostService.remove', call: () => variableCostService.remove('8'), verb: 'delete', args: ['/costs/variable/8'] },
  // Taxas de pagamento
  { label: 'paymentMethodService.getPaymentMethodConfigs', call: () => paymentMethodService.getPaymentMethodConfigs(), verb: 'get', args: ['/settings/financial/payment-methods'] },
  { label: 'paymentMethodService.updatePaymentMethodConfigs', call: () => paymentMethodService.updatePaymentMethodConfigs([payload]), verb: 'put', args: ['/settings/financial/payment-methods', [payload]] },
  // Precificação
  { label: 'calculatePricing', call: () => calculatePricing(payload), verb: 'post', args: ['/pricing/calculate', payload] },
  { label: 'simulateDiscount', call: () => simulateDiscount(payload), verb: 'post', args: ['/pricing/simulate-discount', payload] },
  { label: 'calculateBreakEven', call: () => calculateBreakEven(payload), verb: 'post', args: ['/pricing/break-even', payload] },
  // Catálogo
  { label: 'productService.getProducts', call: () => productService.getProducts(filters), verb: 'get', args: ['/products', { params: filters }] },
  { label: 'productService.getProduct', call: () => productService.getProduct('123'), verb: 'get', args: ['/products/123'] },
  { label: 'productService.createProduct', call: () => productService.createProduct(payload), verb: 'post', args: ['/products', payload] },
  { label: 'productService.updateProduct', call: () => productService.updateProduct('1', payload), verb: 'put', args: ['/products/1', payload] },
  { label: 'productService.patchProduct', call: () => productService.patchProduct('1', payload), verb: 'patch', args: ['/products/1', payload] },
  { label: 'productService.deleteProduct', call: () => productService.deleteProduct('1'), verb: 'delete', args: ['/products/1'], returns: 'void' },
  // Perfil
  { label: 'profileService.get', call: () => profileService.get(), verb: 'get', args: ['/profile'] },
  { label: 'profileService.update', call: () => profileService.update(payload), verb: 'put', args: ['/profile', payload] },
  { label: 'profileService.patch', call: () => profileService.patch(payload), verb: 'patch', args: ['/profile', payload] },
  // Vendas
  { label: 'saleService.getSales', call: () => saleService.getSales({ paymentMethod: 'CREDITO_A_VISTA', page: 0, size: 10 }), verb: 'get', args: ['/sales', { params: { paymentMethod: 'CREDITO_A_VISTA', page: 0, size: 10 } }] },
  { label: 'saleService.getSale', call: () => saleService.getSale('sale-123'), verb: 'get', args: ['/sales/sale-123'] },
  { label: 'saleService.createSale', call: () => saleService.createSale(payload), verb: 'post', args: ['/sales', payload] },
  { label: 'saleService.updateSale', call: () => saleService.updateSale('sale-123', payload), verb: 'put', args: ['/sales/sale-123', payload] },
  { label: 'saleService.deleteSale', call: () => saleService.deleteSale('sale-123'), verb: 'delete', args: ['/sales/sale-123'], returns: 'void' },
  // Segmentos
  { label: 'getSegments', call: () => getSegments(), verb: 'get', args: ['/segments'] },
  // Autenticação
  { label: 'authService.register', call: () => authService.register(payload), verb: 'post', args: ['/auth/register', payload] },
  { label: 'authService.login', call: () => authService.login(payload), verb: 'post', args: ['/auth/login', payload] },
  { label: 'authService.refresh', call: () => authService.refresh('ref-123'), verb: 'post', args: ['/auth/refresh', { refreshToken: 'ref-123' }] }
]

describe('Clientes HTTP — contrato com a API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it.each(CASES)('$label → $verb $args.0', async ({ call, verb, args, returns = 'data' }) => {
    const sentinel = { resposta: Symbol(verb) }
    api[verb].mockResolvedValue({ data: sentinel })

    const result = await call()

    expect(api[verb]).toHaveBeenCalledTimes(1)
    expect(api[verb]).toHaveBeenCalledWith(...args)
    VERBS.filter((other) => other !== verb).forEach((other) => expect(api[other]).not.toHaveBeenCalled())
    if (returns === 'data') expect(result).toBe(sentinel)
    else expect(result).toBeUndefined()
  })
})
