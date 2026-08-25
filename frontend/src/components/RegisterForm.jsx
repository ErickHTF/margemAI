import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Lock,
  Building2,
  Briefcase,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Check
} from 'lucide-react'
import authService from '../services/authService'
import segmentService from '../services/segmentService'
import { MEI_SEGMENTS } from '../constants/segments'
import {
  maskCnpj,
  validateCnpj,
  validatePasswordStrength,
  validateEmail,
  validateName
} from '../utils/validators'

export default function RegisterForm({ onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cnpj: '',
    segment: ''
  })

  const [availableSegments, setAvailableSegments] = useState(MEI_SEGMENTS)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [serverSuccess, setServerSuccess] = useState(null)

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const data = await segmentService.getSegments()
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((seg) => ({
            value: seg.code,
            label: seg.name,
            description: seg.description
          }))
          setAvailableSegments(mapped)
        }
      } catch {
        setAvailableSegments(MEI_SEGMENTS)
      }
    }
    fetchSegments()
  }, [])

  const passwordValidation = validatePasswordStrength(formData.password)

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'O nome é obrigatório.'
        if (!validateName(value)) return 'O nome deve ter entre 2 e 150 caracteres.'
        return null

      case 'email':
        if (!value.trim()) return 'O e-mail é obrigatório.'
        if (!validateEmail(value)) return 'O e-mail informado é inválido.'
        return null

      case 'password': {
        if (!value) return 'A senha é obrigatória.'
        const check = validatePasswordStrength(value)
        if (!check.isValid) {
          return 'A senha não atende a todos os requisitos de segurança.'
        }
        return null
      }

      case 'cnpj': {
        if (!value.trim()) return 'O CNPJ é obrigatório.'
        const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
        if (clean.length !== 14) return 'O CNPJ deve conter 14 caracteres alfanuméricos.'
        if (!validateCnpj(value)) return 'CNPJ inválido. Verifique os caracteres digitados.'
        return null
      }

      case 'segment':
        if (!value) return 'O segmento de atuação do MEI é obrigatório.'
        return null

      default:
        return null
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    const formattedValue = name === 'cnpj' ? maskCnpj(value) : value

    setFormData((prev) => ({
      ...prev,
      [name]: formattedValue
    }))

    if (touched[name]) {
      const error = validateField(name, formattedValue)
      setErrors((prev) => ({
        ...prev,
        [name]: error
      }))
    }

    if (serverError) setServerError(null)
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  const validateAll = () => {
    const newErrors = {}
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key])
      if (error) {
        newErrors[key] = error
      }
    })
    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
      password: true,
      cnpj: true,
      segment: true
    })
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)
    setServerSuccess(null)

    if (!validateAll()) return

    setLoading(true)
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        cnpj: formData.cnpj,
        segment: formData.segment
      }

      const response = await authService.register(payload)
      setServerSuccess('Cadastro realizado com sucesso!')
      if (onRegisterSuccess) {
        onRegisterSuccess(response)
      }
      setFormData({
        name: '',
        email: '',
        password: '',
        cnpj: '',
        segment: ''
      })
      setTouched({})
      setErrors({})
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data
        const message = errorData.message || 'Erro ao processar o cadastro.'
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

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10 transition-all">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mb-4 shadow-sm">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Crie sua conta MEI
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Cadastre seu negócio no Margem.AI e tenha controle inteligente da sua margem de lucro.
        </p>
      </div>

      {serverSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">{serverSuccess}</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Seu cadastro foi concluído com sucesso. Agora você já pode acessar a plataforma.
            </p>
          </div>
        </div>
      )}

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
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome Completo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User className="w-5 h-5" />
            </div>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="ex: Maria dos Santos"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 ${
                touched.name && errors.name
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
          </div>
          {touched.name && errors.name && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.name}
            </p>
          )}
        </div>

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
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="seu.email@exemplo.com"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 ${
                touched.email && errors.email
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
          </div>
          {touched.email && errors.email && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.email}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-slate-700 mb-1.5">
              CNPJ
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building2 className="w-5 h-5" />
              </div>
              <input
                id="cnpj"
                name="cnpj"
                type="text"
                maxLength={18}
                value={formData.cnpj}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="00.000.000/0000-00"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 ${
                  touched.cnpj && errors.cnpj
                    ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
                }`}
              />
            </div>
            {touched.cnpj && errors.cnpj && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.cnpj}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="segment" className="block text-sm font-medium text-slate-700 mb-1.5">
              Segmento de Atuação
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <select
                id="segment"
                name="segment"
                value={formData.segment}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-8 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 appearance-none ${
                  touched.segment && errors.segment
                    ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
                }`}
              >
                <option value="">Selecione o segmento...</option>
                {availableSegments.map((seg) => (
                  <option key={seg.value} value={seg.value}>
                    {seg.label}
                  </option>
                ))}
              </select>
            </div>
            {touched.segment && errors.segment && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.segment}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Senha Forte
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="••••••••••••"
              className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 bg-slate-50/50 ${
                touched.password && errors.password
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                  : 'border-slate-200 focus:ring-indigo-100 focus:border-indigo-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
            <p className="text-xs font-semibold text-slate-600 mb-1">Requisitos da senha:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
              <div className={`flex items-center gap-1.5 ${passwordValidation.rules.minLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                {passwordValidation.rules.minLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                Mínimo de 8 caracteres
              </div>
              <div className={`flex items-center gap-1.5 ${passwordValidation.rules.upperCase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                {passwordValidation.rules.upperCase ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                Uma letra maiúscula (A-Z)
              </div>
              <div className={`flex items-center gap-1.5 ${passwordValidation.rules.lowerCase ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                {passwordValidation.rules.lowerCase ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                Uma letra minúscula (a-z)
              </div>
              <div className={`flex items-center gap-1.5 ${passwordValidation.rules.number ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                {passwordValidation.rules.number ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                Um número (0-9)
              </div>
              <div className={`flex items-center gap-1.5 ${passwordValidation.rules.specialChar ? 'text-emerald-600 font-medium' : 'text-slate-400'} sm:col-span-2`}>
                {passwordValidation.rules.specialChar ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 inline-block" />}
                Um caractere especial (@$!%*?&#^()_+=-)
              </div>
            </div>
          </div>

          {touched.password && errors.password && (
            <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 shrink-0" />
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
              <span>Cadastrando...</span>
            </>
          ) : (
            <span>Concluir Cadastro</span>
          )}
        </button>
      </form>
    </div>
  )
}
