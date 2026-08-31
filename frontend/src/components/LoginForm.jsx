import { useState } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  LogIn
} from 'lucide-react'
import { validateEmail } from '../utils/validators'

export default function LoginForm({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const validateField = (field, value) => {
    switch (field) {
      case 'email':
        if (!value.trim()) return 'O e-mail é obrigatório.'
        if (!validateEmail(value)) return 'O e-mail informado é inválido.'
        return null

      case 'password':
        if (!value) return 'A senha é obrigatória.'
        return null

      default:
        return null
    }
  }

  const handleChange = (field, value) => {
    if (field === 'email') setEmail(value)
    if (field === 'password') setPassword(value)

    if (touched[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value)
      }))
    }

    if (serverError) setServerError(null)
  }

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({
      ...prev,
      [field]: validateField(field, value)
    }))
  }

  const validateAll = () => {
    const newErrors = {
      email: validateField('email', email),
      password: validateField('password', password)
    }
    setErrors(newErrors)
    setTouched({ email: true, password: true })
    return !Object.values(newErrors).some(Boolean)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    if (!validateAll()) return

    setLoading(true)
    try {
      const data = await onLoginSuccess({ email: email.trim(), password })
      if (!data) setServerError({ message: 'Não foi possível entrar. Tente novamente.' })
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data
        const message = errorData.message || 'Erro ao entrar na plataforma.'
        const details = Array.isArray(errorData.details) ? errorData.details : []
        setServerError({ message, details })
      } else {
        setServerError({
          message: 'Falha de conexão com o servidor. Verifique se o backend está em execução.'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 ${
      touched[field] && errors[field]
        ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
        : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
    }`

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10 transition-all">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
          <LogIn className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Bem-vindo de volta
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Acesse sua conta para gerenciar a margem do seu negócio.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-left">
            <p className="font-semibold text-sm">{serverError.message}</p>
            {serverError.details && serverError.details.length > 0 && (
              <ul className="mt-1.5 list-disc list-inside text-xs text-rose-700 space-y-1">
                {serverError.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            E-mail
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={(e) => handleBlur('email', e.target.value)}
              placeholder="seu.email@exemplo.com"
              className={inputClass('email')}
            />
          </div>
          {touched.email && errors.email && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={(e) => handleBlur('password', e.target.value)}
              placeholder="••••••••••••"
              className={`${inputClass('password')} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {touched.password && errors.password && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Entrando...</span>
            </>
          ) : (
            <span>Entrar</span>
          )}
        </button>
      </form>
    </div>
  )
}
