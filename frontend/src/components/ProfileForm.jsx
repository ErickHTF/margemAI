import useDraft from '../hooks/useDraft'
import { useState } from 'react'
import {
  User,
  Briefcase,
  Wallet,
  Save,
  ArrowLeft
} from 'lucide-react'
import profileService from '../services/profileService'
import PageHeader from './PageHeader'
import { Button, Card, Field, Input, Notice, Select } from './ui'
import { MEI_SEGMENTS } from '../constants/segments'
import { validateName } from '../utils/validators'
import { maskCurrency, unmaskCurrency, currencyToDigits } from '../utils/formatters'

export default function ProfileForm({ initialProfile, segments = MEI_SEGMENTS, onCancel, onSaved }) {
  const [name, setName] = useState(initialProfile?.name || '')
  const [segment, setSegment] = useState(initialProfile?.segment || '')
  const [capDigits, setCapDigits] = useState(currencyToDigits(initialProfile?.customAnnualCap))
  const { dirty, changes, guard } = useDraft({ name, segment, capDigits })

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

  const fieldError = (field) => (touched[field] && errors[field]) || undefined

  return (
    <div className="w-full space-y-6">
      <PageHeader
        Icon={User}
        title="Meu Perfil"
        description="Mantenha seus dados e o teto anual atualizados para calibrar seus relatórios."
      />

      <Card padding="lg" className="w-full max-w-2xl">
        <h2 className="text-base font-bold text-slate-900 mb-5">Editar dados cadastrais</h2>

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

        <form data-tour="profile-form" onSubmit={handleSubmit} noValidate className="space-y-5 text-left">
          {dirty && <p role="status" className="text-sm text-amber-700">{changes} {changes === 1 ? 'alteração não salva' : 'alterações não salvas'}</p>}
          <Field label="Nome Completo" error={fieldError('name')}>
            <Input
              id="profile-name"
              type="text"
              Icon={User}
              value={name}
              onChange={handleNameChange}
              onBlur={(e) => handleBlur('name', e.target.value)}
              placeholder="ex: Maria dos Santos"
            />
          </Field>

          <Field label="Segmento de Atuação" error={fieldError('segment')}>
            <Select
              id="profile-segment"
              Icon={Briefcase}
              value={segment}
              onChange={handleSegmentChange}
              onBlur={(e) => handleBlur('segment', e.target.value)}
            >
              <option value="">Selecione o segmento...</option>
              {segments.map((seg) => (
                <option key={seg.value} value={seg.value}>
                  {seg.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Teto Anual de Faturamento (R$)"
            error={fieldError('customAnnualCap')}
            hint="O teto oficial do MEI é de R$ 81.000,00. Defina um valor personalizado para receber alertas mais cedo."
          >
            <Input
              id="profile-customAnnualCap"
              type="text"
              inputMode="numeric"
              Icon={Wallet}
              value={maskCurrency(capDigits)}
              onChange={handleCapChange}
              onBlur={(e) => handleBlur('customAnnualCap', e.target.value)}
              placeholder="81.000,00"
            />
          </Field>

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
            <Button variant="secondary" Icon={ArrowLeft} className="w-full sm:flex-1" onClick={() => guard(onCancel)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              data-tour="profile-save"
              type="submit"
              Icon={Save}
              loading={loading}
              disabled={!dirty}
              className="w-full sm:flex-1"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
