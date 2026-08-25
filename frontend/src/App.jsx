import { useState } from 'react'
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react'
import RegisterForm from './components/RegisterForm'

export default function App() {
  const [registeredUser, setRegisteredUser] = useState(null)

  const handleRegisterSuccess = (authData) => {
    setRegisteredUser(authData)
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
        {registeredUser ? (
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Conta Criada com Sucesso!
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Olá, <strong className="text-slate-900">{registeredUser.user?.name}</strong>. Sua conta MEI foi cadastrada com sucesso.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-700 mb-6 text-left space-y-2 border border-slate-100">
              <p className="flex justify-between">
                <span className="text-slate-500">Nome:</span>
                <span className="font-semibold text-slate-900">{registeredUser.user?.name}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">E-mail:</span>
                <span className="font-semibold text-slate-900">{registeredUser.user?.email}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">CNPJ:</span>
                <span className="font-semibold text-slate-900">{registeredUser.user?.cnpj}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Segmento:</span>
                <span className="font-semibold text-indigo-600">{registeredUser.user?.segment}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegisteredUser(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Cadastrar outro usuário</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
        )}
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Margem.AI - Soluções inteligentes para Microempreendedores Individuais.
      </footer>
    </div>
  )
}
