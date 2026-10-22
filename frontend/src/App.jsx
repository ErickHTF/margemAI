import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Landmark,
  PiggyBank,
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
  ShoppingBag,
  CreditCard,
  BarChart3
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
import PaymentMethodSettings from './components/PaymentMethodSettings'
import MonthlyFlowDashboard from './components/MonthlyFlowDashboard'
import BusinessAccounts from './components/BusinessAccounts'
import FinancialReserveManager from './components/FinancialReserveManager'
import SectionTour from './components/SectionTour'
import { DraftContext } from './components/DraftContext'
import ConfirmDialog from './components/ConfirmDialog'
import { Button, Card, IconButton } from './components/ui'

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
      { key: 'products', label: 'Catálogo', Icon: Package }
    ]
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { key: 'accounts', label: 'Contas Empresariais', Icon: Landmark },
      { key: 'reserves', label: 'Reserva Financeira', Icon: PiggyBank },
      { key: 'sales', label: 'Vendas', Icon: ShoppingBag },
      { key: 'cashflow', label: 'Fluxo de Caixa', Icon: BarChart3 },
      { key: 'costs', label: 'Custos', Icon: Wallet },
      { key: 'pricing', label: 'Calculadora Markup', Icon: Calculator }
    ]
  },
  {
    key: 'settings',
    label: 'Configurações',
    items: [
      { key: 'categories', label: 'Padrões de Preço', Icon: Tags },
      { key: 'payment-methods', label: 'Taxas de Pagamento', Icon: CreditCard }
    ]
  }
]

const readSection = () => {
  const key = window.location.hash.slice(1)
  return NAV_GROUPS.some(group => group.items.some(item => item.key === key)) ? key : 'profile'
}

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
  const [activeSection, setActiveSection] = useState(readSection)
  const [drafts, setDrafts] = useState({})
  const registerDraft = useCallback((id, dirty) => setDrafts(previous => {
    if (Boolean(previous[id]) === dirty) return previous
    const next = { ...previous }
    if (dirty) next[id] = true
    else delete next[id]
    return next
  }), [])
  const dirty = Object.values(drafts).some(Boolean)
  const historyIndex = useRef(window.history.state?.margemIndex || 0)
  const ignorePop = useRef(false)
  const allowPop = useRef(false)
  const [pendingLeaveAction, setPendingLeaveAction] = useState(null)
  const [saleBusy, setSaleBusy] = useState(false)
  const [saleDraft, setSaleDraft] = useState(null)
  const [returnSection, setReturnSection] = useState(null)
  const userKey = user?.id || user?.email
  const [previousUserKey, setPreviousUserKey] = useState(userKey)
  if (previousUserKey !== userKey) {
    setPreviousUserKey(userKey)
    setSaleDraft(null)
    setReturnSection(null)
  }
  const currentDraft = saleDraft && saleDraft.owner === userKey ? saleDraft.value : null
  const saveSaleDraft = useCallback((value) => setSaleDraft({ owner: userKey, value }), [userKey])

  useEffect(() => {
    if (!currentDraft) return
    const warn = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [currentDraft])

  const { group: activeGroup, item: activeItem } = findActive(activeSection)

  const handleLoginSuccess = async (credentials) => {
    const data = await login(credentials)
    setRegisteredUser(null)
    return data
  }

  const guardLeave = (action) => {
    if (saleBusy) return
    if (dirty) {
      setPendingLeaveAction(() => action)
      return
    }
    action()
  }

  const changeSection = (sectionKey) => {
    historyIndex.current += 1
    window.history.pushState({ margemIndex: historyIndex.current }, '', `#${sectionKey}`)
    setActiveSection(sectionKey)
  }

  const navigateTo = (sectionKey) => {
    if (sectionKey === activeSection) return
    guardLeave(() => changeSection(sectionKey))
  }

  const navigateContext = (sectionKey) => {
    if (saleBusy) return
    const navigate = () => {
      setReturnSection({ owner: userKey, section: activeSection })
      changeSection(sectionKey)
    }
    // Na tela de Vendas o rascunho fica guardado no App: dá para sair e voltar sem perder nada.
    if (activeSection === 'sales') navigate()
    else guardLeave(navigate)
  }

  const handleLogout = () => {
    if (saleBusy) return
    const leave = () => {
      setSaleDraft(null)
      setReturnSection(null)
      logout()
    }
    if (currentDraft) setPendingLeaveAction(() => leave)
    else guardLeave(leave)
  }
  useEffect(() => {
    window.history.replaceState({ margemIndex: historyIndex.current }, '', `#${readSection()}`)
  }, [])

  useEffect(() => {
    const onPop = event => {
      if (ignorePop.current) { ignorePop.current = false; return }
      const nextIndex = event.state?.margemIndex ?? historyIndex.current + 1
      const delta = nextIndex - historyIndex.current
      const nextSection = readSection()
      if (dirty && !allowPop.current) {
        if (delta) { ignorePop.current = true; window.history.go(-delta) }
        else window.history.replaceState({ margemIndex: historyIndex.current }, '', `#${activeSection}`)
        setPendingLeaveAction(() => () => {
          if (delta) { allowPop.current = true; window.history.go(delta) }
          else setActiveSection(nextSection)
        })
        return
      }
      allowPop.current = false
      historyIndex.current = nextIndex
      setActiveSection(nextSection)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [dirty, activeSection])

  useEffect(() => {
    if (!dirty) return undefined
    const beforeUnload = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!document.querySelector('[role="dialog"], [role="alertdialog"]')) document.getElementById('main-content')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeSection])


  const confirmLeave = () => {
    const action = pendingLeaveAction
    setPendingLeaveAction(null)
    action?.()
  }

  const cancelLeave = useCallback(() => setPendingLeaveAction(null), [])

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
      case 'accounts':
        return <BusinessAccounts />
      case 'reserves':
        return <FinancialReserveManager onNavigate={navigateContext} />
      case 'sales':
        return <SalesManager key={userKey} onNavigate={navigateContext} draft={currentDraft} onDraftChange={saveSaleDraft} onBusyChange={setSaleBusy} />
      case 'cashflow':
        return <MonthlyFlowDashboard onNavigate={navigateContext} />
      case 'payment-methods':
        return <PaymentMethodSettings />
      case 'costs':
        return <CostsDashboard />
      case 'pricing':
        return <PricingCalculator onNavigate={navigateContext} />
      default:
        return <ProfilePanel user={user} onUserUpdate={updateUser} />
    }
  }

  const renderAuthenticated = () => (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 antialiased">
      <a href="#main-content" onClick={event => { event.preventDefault(); const main = document.getElementById('main-content'); main?.focus(); main?.scrollIntoView() }} className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-xl focus:bg-white focus:p-3 focus:text-indigo-700 focus:shadow-lg">Ir para o conteúdo</a>
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:sticky lg:top-0 lg:h-screen shrink-0 border-r border-slate-200 bg-white/80 backdrop-blur">
        <div className="px-6 py-6 border-b border-slate-100">
          <Brand />
          <p className="text-xs text-slate-500 font-medium mt-2">Gestão Inteligente para MEI</p>
        </div>

        <nav aria-label="Menu principal" className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {NAV_GROUPS.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
              {group.items.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  aria-current={activeSection === key ? 'page' : undefined}
                  onClick={() => navigateTo(key)}
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
          <Button variant="danger" fullWidth Icon={LogOut} onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="flex items-center justify-between px-4 py-3">
            <Brand />
            <IconButton label="Sair" Icon={LogOut} tone="rose" size="lg" onClick={handleLogout} />
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
                      aria-current={activeSection === key ? 'page' : undefined}
                      onClick={() => navigateTo(key)}
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

        <main id="main-content" tabIndex={-1} aria-label={activeItem.label} className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
          <div className="w-full max-w-6xl mx-auto">
            {returnSection?.owner === userKey && returnSection.section !== activeSection && (
              <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <p>Você abriu este módulo para continuar uma tarefa. {currentDraft && 'O rascunho da venda está mantido apenas nesta sessão; recarregar ou sair apaga os dados.'}</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => guardLeave(() => { changeSection(returnSection.section); setReturnSection(null) })}>
                  Voltar para {findActive(returnSection.section).item.label}
                </button>
              </div>
            )}
            <SectionTour key={activeSection} section={activeSection}>{renderSection()}</SectionTour>
          </div>
        </main>

        <footer className="w-full px-4 sm:px-6 lg:px-10 py-6 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Margem.AI - Soluções inteligentes para
          Microempreendedores Individuais.
        </footer>
      </div>

      <ConfirmDialog
        open={pendingLeaveAction !== null}
        title="Sair sem salvar?"
        message="Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas."
        confirmLabel="Sair sem salvar"
        cancelLabel="Continuar editando"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
      />
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
        <Card padding="lg" className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Conta Criada com Sucesso!</h2>
          <p className="text-sm text-slate-600 mb-6">
            Olá, <strong className="text-slate-900">{registeredUser.user?.name}</strong>. Sua conta
            MEI foi cadastrada com sucesso.
          </p>
          <Button fullWidth onClick={() => setRegisteredUser(null)}>
            Entrar na plataforma
          </Button>
        </Card>
      )
    }

    return (
      <div className="w-full max-w-md">
        {showRegister ? (
          <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
        ) : (
          <LoginForm onLoginSuccess={handleLoginSuccess} />
        )}
        <Button variant="link" fullWidth className="mt-4 py-2.5" onClick={() => setShowRegister(!showRegister)}>
          {showRegister ? 'Já tenho uma conta. Entrar' : 'Ainda não tenho conta. Cadastrar'}
        </Button>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return <DraftContext.Provider value={{ register: registerDraft, guard: guardLeave }}>{renderAuthenticated()}</DraftContext.Provider>
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
