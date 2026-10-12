import { useState } from 'react'
import {
  Fingerprint,
  Lock,
  Eye,
  EyeOff,
  LogIn
} from 'lucide-react'
import { Button, Card, Field, IconButton, Input, Notice } from './ui'
import { validateCnpj, validateEmail } from '../utils/validators'

export default function LoginForm({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const isCnpj = (value) => !value.includes('@')

  const validateField = (field, value) => {
    switch (field) {
      case 'identifier':
        if (!value.trim()) return 'Informe seu e-mail ou CNPJ.'
        if (isCnpj(value)) {
          if (!validateCnpj(value)) return 'O CNPJ informado é inválido.'
        } else if (!validateEmail(value)) {
          return 'O e-mail informado é inválido.'
        }
        return null

      case 'password':
        if (!value) return 'A senha é obrigatória.'
        return null

      default:
        return null
    }
  }

  const handleChange = (field, value) => {
    if (field === 'identifier') setIdentifier(value)
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
      identifier: validateField('identifier', identifier),
      password: validateField('password', password)
    }
    setErrors(newErrors)
    setTouched({ identifier: true, password: true })
    return !Object.values(newErrors).some(Boolean)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    if (!validateAll()) return

    setLoading(true)
    try {
      const data = await onLoginSuccess({ identifier: identifier.trim(), password })
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

  const fieldError = (field) => (touched[field] && errors[field]) || undefined

  return (
    <Card padding="lg" className="w-full max-w-md mx-auto">
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
        <Field label="E-mail ou CNPJ" error={fieldError('identifier')}>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            Icon={Fingerprint}
            value={identifier}
            onChange={(e) => handleChange('identifier', e.target.value)}
            onBlur={(e) => handleBlur('identifier', e.target.value)}
            placeholder="seu.email@exemplo.com ou 00.000.000/0000-00"
          />
        </Field>

        <Field label="Senha" error={fieldError('password')}>
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            Icon={Lock}
            action={
              <IconButton
                label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                Icon={showPassword ? EyeOff : Eye}
                onClick={() => setShowPassword(!showPassword)}
              />
            }
            value={password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={(e) => handleBlur('password', e.target.value)}
            placeholder="••••••••••••"
          />
        </Field>

        <Button type="submit" fullWidth loading={loading} className="mt-2">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </Card>
  )
}
