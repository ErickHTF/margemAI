import { useState } from 'react'
import {
  User,
  Briefcase,
  Wallet,
  XCircle,
  AlertCircle,
  Loader2,
  Save,
  ArrowLeft
} from 'lucide-react'
import profileService from '../services/profileService'
import { MEI_SEGMENTS } from '../constants/segments'
import { validateName } from '../utils/validators'
import { maskCurrency, unmaskCurrency, currencyToDigits } from '../utils/formatters'

export default function ProfileForm({ initialProfile, segments = MEI_SEGMENTS, onCancel, onSaved }) {
  const [name, setName] = useState(initialProfile?.name || '')
  const [segment, setSegment] = useState(initialProfile?.segment || '')
  const [capDigits, setCapDigits] = useState(currencyToDigits(initialProfile?.customAnnualCap))
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState(null)

  const validateField = (field, value) => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'O nome é obrigatório.'
        if (!validateName(value)) return 'O nome deve ter entre 2 e 150 caracteres.'
        return null

      case 'segment':
        if (!value) return 'Selecione o segmento de atuação.'
        return null

      case 'customAnnualCap':
        if (!value) return 'Informe o teto anual de faturamento.'
        if (unmaskCurrency(value) <= 0) return 'O teto anual deve ser maior que zero.'
        return null

      default:
        return null
    }
  }

  const handleNameChange = (e) => {
    setName(e.target.value)
    if (touched.name) setErrors((prev) => ({ ...prev, name: validateField('name', e.target.value) }))
    if (serverError) setServerError(null)
  }

  const handleSegmentChange = (e) => {
    setSegment(e.target.value)
    if (touched.segment) {
      setErrors((prev) => ({ ...prev, segment: validateField('segment', e.target.value) }))
    }
    if (serverError) setServerError(null)
  }

  const handleCapChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setCapDigits(digits)
    if (touched.customAnnualCap) {
      setErrors((prev) => ({ ...prev, customAnnualCap: validateField('customAnnualCap', digits) }))
    }
    if (serverError) setServerError(null)
  }

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }))
  }

  const validateAll = () => {
    const newErrors = {
      name: validateField('name', name),
      segment: validateField('segment', segment),
      customAnnualCap: validateField('customAnnualCap', capDigits)
    }
    setErrors(newErrors)
    setTouched({ name: true, segment: true, customAnnualCap: true })
    return !Object.values(newErrors).some(Boolean)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    if (!validateAll()) return

    setLoading(true)
    try {
      const payload = {
        name: name.trim(),
        segment,
        customAnnualCap: unmaskCurrency(capDigits)
      }
      const updatedProfile = await profileService.update(payload)
      if (onSaved) onSaved(updatedProfile)
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data
        const message = errorData.message || 'Erro ao atualizar o perfil.'
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

  const fieldIcon = (field, Icon) => (
    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
      <Icon className="w-5 h-5" />
    </div>
  )

  const fieldError = (field) =>
    touched[field] && errors[field] ? (
      <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        {errors[field]}
      </p>
    ) : null

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in zoom-in-95">
      <div className="text-center mb-7">
        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Editar dados cadastrais</h2>
        <p className="text-sm text-slate-500">
          Mantenha seus dados e o teto anual atualizados para calibrar seus relatórios.
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
          <label htmlFor="profile-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome Completo
          </label>
          <div className="relative">
            {fieldIcon('name', User)}
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              onBlur={(e) => handleBlur('name', e.target.value)}
              placeholder="ex: Maria dos Santos"
              className={inputClass('name')}
            />
          </div>
          {fieldError('name')}
        </div>

        <div>
          <label htmlFor="profile-segment" className="block text-sm font-medium text-slate-700 mb-1.5">
            Segmento de Atuação
          </label>
          <div className="relative">
            {fieldIcon('segment', Briefcase)}
            <select
              id="profile-segment"
              value={segment}
              onChange={handleSegmentChange}
              onBlur={(e) => handleBlur('segment', e.target.value)}
              className={`${inputClass('segment')} pr-8 appearance-none`}
            >
              <option value="">Selecione o segmento...</option>
              {segments.map((seg) => (
                <option key={seg.value} value={seg.value}>
                  {seg.label}
                </option>
              ))}
            </select>
          </div>
          {fieldError('segment')}
        </div>

        <div>
          <label
            htmlFor="profile-customAnnualCap"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Teto Anual de Faturamento (R$)
          </label>
          <div className="relative">
            {fieldIcon('customAnnualCap', Wallet)}
            <input
              id="profile-customAnnualCap"
              type="text"
              inputMode="numeric"
              value={maskCurrency(capDigits)}
              onChange={handleCapChange}
              onBlur={(e) => handleBlur('customAnnualCap', e.target.value)}
              placeholder="81.000,00"
              className={inputClass('customAnnualCap')}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            O teto oficial do MEI é de R$ 81.000,00. Defina um valor personalizado para receber
            alertas mais cedo.
          </p>
          {fieldError('customAnnualCap')}
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm shadow-md hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
