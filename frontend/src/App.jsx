import { useState } from 'react'
import { Sparkles, LogOut, CheckCircle2, LayoutDashboard, Wallet, Package, Calculator, Loader2 } from 'lucide-react'
import useAuth from './hooks/useAuth'
import LoginForm from './components/LoginForm'
import RegisterForm from './components/RegisterForm'
import ProfilePanel from './components/ProfilePanel'
import CostsDashboard from './components/CostsDashboard'
import ProductManager from './components/ProductManager'
import PricingCalculator from './components/PricingCalculator'

export default function App() {
  const { user, login, logout, updateUser, isAuthenticated, initializing } = useAuth()
  const [showRegister, setShowRegister] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)
  const [activeSection, setActiveSection] = useState('profile')

  const handleLoginSuccess = async (credentials) => {
    const data = await login(credentials)
    setRegisteredUser(null)
    return data
  }

  const handleRegisterSuccess = (authData) => {
    setRegisteredUser(authData)
    setShowRegister(false)
  }

  const sectionTabs = [
    { key: 'profile', label: 'Meu Perfil', Icon: LayoutDashboard },
    { key: 'products', label: 'Catálogo', Icon: Package },
    { key: 'costs', label: 'Custos', Icon: Wallet },
    { key: 'pricing', label: 'Calculadora Markup', Icon: Calculator }
  ]

  const renderAuthenticated = () => (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-3xl mb-6">
        <div className="bg-white/70 backdrop-blur rounded-2xl p-1.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-1 shadow-sm">
          {sectionTabs.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveSection(key)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                activeSection === key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'profile' && <ProfilePanel user={user} onUserUpdate={updateUser} />}
      {activeSection === 'products' && <ProductManager />}
      {activeSection === 'costs' && <CostsDashboard />}
      {activeSection === 'pricing' && <PricingCalculator />}

      <div className="mt-6 w-full max-w-md">
        <button
          type="button"
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  const renderContent = () => {
    if (initializing) {
      return (
        <div className="w-full max-w-md flex flex-col items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
          <p className="text-sm">Restaurando sua sessão...</p>
        </div>
      )
    }

    if (isAuthenticated && user) {
      return renderAuthenticated()
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 flex flex-col justify-between antialiased">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-indigo-200 shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Margem<span className="text-indigo-600">.AI</span>
          </span>
        </div>
        <div className="text-xs sm:text-sm text-slate-500 font-medium">
          Gestão Inteligente para MEI
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col items-center justify-center">
        {renderContent()}
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Margem.AI - Soluções inteligentes para Microempreendedores
        Individuais.
      </footer>
    </div>
  )
}
