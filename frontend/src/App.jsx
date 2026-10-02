import { useState } from 'react'
import {
  Sparkles,
  LogOut,
  CheckCircle2,
  User,
  Wallet,
  Package,
  Calculator,
  Tags,
  Loader2,
  ChevronRight,
  ShoppingBag
} from 'lucide-react'
import useAuth from './hooks/useAuth'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import ProfilePanel from './components/ProfilePanel'
import CostsDashboard from './components/CostsDashboard'
import ProductManager from './components/ProductManager'
import CategoryManager from './components/CategoryManager'
import PricingCalculator from './components/PricingCalculator'
import SalesManager from './components/SalesManager'

const NAV_GROUPS = [
  {
    key: 'account',
    label: 'Conta',
    items: [{ key: 'profile', label: 'Meu Perfil', Icon: User }]
  },
  {
    key: 'registry',
    label: 'Cadastros',
    items: [
      { key: 'products', label: 'Catálogo', Icon: Package },
      { key: 'categories', label: 'Padrões de Preço', Icon: Tags }
    ]
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { key: 'sales', label: 'Vendas', Icon: ShoppingBag },
      { key: 'costs', label: 'Custos', Icon: Wallet },
      { key: 'pricing', label: 'Calculadora Markup', Icon: Calculator }
    ]
  }
]

const findActive = (sectionKey) => {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((navItem) => navItem.key === sectionKey)
    if (item) return { group, item }
  }
  return { group: NAV_GROUPS[0], item: NAV_GROUPS[0].items[0] }
}

const getInitials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-md">
      <Sparkles className="w-5 h-5" />
    </div>
    <span className="text-xl font-bold tracking-tight text-slate-900">
      Margem<span className="text-indigo-600">.AI</span>
    </span>
  </div>
)

const navItemClass = (isActive) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
    isActive
      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
      : 'text-slate-600 hover:bg-slate-100'
  }`

export default function App() {
  const { user, login, logout, updateUser, isAuthenticated, initializing } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)
  const [activeSection, setActiveSection] = useState('profile')

  const { group: activeGroup, item: activeItem } = findActive(activeSection)

  const handleLoginSuccess = async (credentials) => {
    const data = await login(credentials)
    setRegisteredUser(null)
    return data
  }

  const handleRegisterSuccess = (authData) => {
    setRegisteredUser(authData)
    setShowRegister(false)
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'products':
        return <ProductManager />
      case 'categories':
        return <CategoryManager />
      case 'sales':
        return <SalesManager />
      case 'costs':
        return <CostsDashboard />
      case 'pricing':
        return <PricingCalculator />
      default:
        return <ProfilePanel user={user} onUserUpdate={updateUser} />
    }
  }

  const renderAuthenticated = () => (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 antialiased">
      <aside className="hidden lg:flex lg:flex-col lg:w-72 shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur">
        <div className="px-6 py-6 border-b border-slate-100">
          <Brand />
          <p className="text-xs text-slate-500 font-medium mt-2">Gestão Inteligente para MEI</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {NAV_GROUPS.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              {group.items.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveSection(key)}
                  className={`w-full ${navItemClass(activeSection === key)}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            <Brand />
            <button
              type="button"
              onClick={logout}
              title="Sair"
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-stretch gap-3 overflow-x-auto px-4 pb-3">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.key} className="flex items-center gap-2 shrink-0">
                {groupIndex > 0 && <span className="w-px self-stretch bg-slate-200" />}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                  {group.label}
                </span>
                <div className="flex gap-1.5">
                  {group.items.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveSection(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        activeSection === key
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="hidden lg:flex items-center gap-2 px-8 py-4 border-b border-slate-200/70 bg-white/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {activeGroup.label}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-xs font-semibold text-slate-700">{activeItem.label}</span>
        </div>

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
          <div className="w-full max-w-6xl mx-auto">{renderSection()}</div>
        </main>

        <footer className="w-full px-4 sm:px-6 lg:px-10 py-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Margem.AI - Soluções inteligentes para
          Microempreendedores Individuais.
        </footer>
      </div>
    </div>
  )

  const renderGuestContent = () => {
    if (initializing) {
      return (
        <div className="w-full max-w-md flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
          <p className="text-sm">Restaurando sua sessão...</p>
        </div>
      )
    }

    if (registeredUser) {
      return (
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Conta Criada com Sucesso!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Olá, <strong className="text-slate-900">{registeredUser.user?.name}</strong>. Sua conta
            MEI foi cadastrada com sucesso.
          </p>
          <button
            type="button"
            onClick={() => setRegisteredUser(null)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all cursor-pointer"
          >
            Entrar na plataforma
          </button>
        </div>
      )
    }

    return (
      <div className="w-full max-w-md">
        {showRegister ? (
          <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
        ) : (
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        )}
        <button
          type="button"
          onClick={() => setShowRegister(!showRegister)}
          className="w-full mt-4 py-2.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
        >
          {showRegister ? 'Já tenho uma conta. Entrar' : 'Ainda não tenho conta. Cadastrar'}
        </button>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return renderAuthenticated()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex flex-col justify-between antialiased">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <Brand />
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Gestão Inteligente para MEI
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col items-center justify-center">
        {renderGuestContent()}
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Margem.AI - Soluções inteligentes para Microempreendedores
        Individuais.
      </footer>
    </div>
  )
}
