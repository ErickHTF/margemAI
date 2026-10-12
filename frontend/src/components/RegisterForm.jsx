import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Lock,
  Building2,
  Briefcase,
  Eye,
  EyeOff,
  Check
} from 'lucide-react'
import { Button, Card, Field, IconButton, Input, Notice, Select } from './ui'
import { authService } from '../security'
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

  const fieldError = (field) => (touched[field] && errors[field]) || undefined

  return (
    <Card padding="lg" className="w-full max-w-xl mx-auto">
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
        <Notice tone="emerald" title={serverSuccess} className="mb-6">
          <p className="text-xs text-emerald-700 mt-0.5">
            Seu cadastro foi concluído com sucesso. Agora você já pode acessar a plataforma.
          </p>
        </Notice>
      )}

      {serverError && (
        <Notice tone="rose" title={serverError.message} className="mb-6 text-left">
          {serverError.details && serverError.details.length > 0 && (
            <ul className="mt-1.5 list-disc list-inside text-xs text-rose-700 space-y-1">
              {serverError.details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </Notice>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
        <Field label="Nome Completo" error={fieldError('name')}>
          <Input
            id="name"
            name="name"
            type="text"
            Icon={User}
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="ex: Maria dos Santos"
          />
        </Field>

        <Field label="E-mail" error={fieldError('email')}>
          <Input
            id="email"
            name="email"
            type="email"
            Icon={Mail}
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="seu.email@exemplo.com"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="CNPJ" error={fieldError('cnpj')}>
            <Input
              id="cnpj"
              name="cnpj"
              type="text"
              maxLength={18}
              Icon={Building2}
              value={formData.cnpj}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="00.000.000/0000-00"
            />
          </Field>

          <Field label="Segmento de Atuação" error={fieldError('segment')}>
            <Select
              id="segment"
              name="segment"
              Icon={Briefcase}
              value={formData.segment}
              onChange={handleChange}
              onBlur={handleBlur}
            >
              <option value="">Selecione o segmento...</option>
              {availableSegments.map((seg) => (
                <option key={seg.value} value={seg.value}>
                  {seg.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Senha Forte"
          error={fieldError('password')}
          hint={
            <Card tone="muted" inset padding="sm" className="space-y-1.5">
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
            </Card>
          }
        >
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            Icon={Lock}
            action={
              <IconButton
                label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                Icon={showPassword ? EyeOff : Eye}
                onClick={() => setShowPassword(!showPassword)}
              />
            }
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••••••••"
          />
        </Field>

        <Button type="submit" fullWidth loading={loading} className="mt-2">
          {loading ? 'Cadastrando...' : 'Concluir Cadastro'}
        </Button>
      </form>
    </Card>
  )
}
