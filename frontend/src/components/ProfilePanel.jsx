import { useState, useEffect } from 'react'
import { User, Pencil, AlertCircle, Loader2 } from 'lucide-react'
import profileService from '../services/profileService'
import segmentService from '../services/segmentService'
import { MEI_SEGMENTS } from '../constants/segments'
import { maskCnpj } from '../utils/validators'
import { formatCurrencyBRL } from '../utils/formatters'
import ProfileForm from './ProfileForm'

export default function ProfilePanel({ user, onUserUpdate }) {
  const [profile, setProfile] = useState(null)
  const [segments, setSegments] = useState(MEI_SEGMENTS)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileData, segmentData] = await Promise.all([
          profileService.get(),
          segmentService.getSegments()
        ])
        setProfile(profileData)
        if (Array.isArray(segmentData) && segmentData.length > 0) {
          const mapped = segmentData.map((seg) => ({ value: seg.code, label: seg.name }))
          setSegments(mapped)
        }
      } catch {
        setError('Não foi possível carregar seus dados cadastrais. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [reloadKey])

  const segmentLabel = (code) => {
    const found = segments.find((seg) => seg.value === code)
    return found ? found.label : code
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  const handleSaved = (updatedProfile) => {
    setProfile(updatedProfile)
    setEditing(false)
    if (onUserUpdate) {
      onUserUpdate({ name: updatedProfile.name, segment: updatedProfile.segment })
    }
  }

  if (editing) {
    return (
      <ProfileForm
        initialProfile={profile}
        segments={segments}
        onCancel={() => setEditing(false)}
        onSaved={handleSaved}
      />
    )
  }

  if (loading) {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Carregando seus dados...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-4" />
        <p className="text-sm text-rose-600 font-medium mb-4">{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all cursor-pointer"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const displayName = profile?.name || user?.name || ''

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center">
      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5">
        <User className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-1">Olá, {displayName}!</h2>
      <p className="text-sm text-slate-500 mb-6">
        Estes dados calibram seus relatórios e alertas financeiros.
      </p>

      <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-700 mb-6 text-left space-y-2 border border-slate-100">
        <p className="flex justify-between">
          <span className="text-slate-500">E-mail:</span>
          <span className="font-semibold text-slate-900 break-all ml-3">{profile?.email}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-slate-500">CNPJ:</span>
          <span className="font-semibold text-slate-900">{maskCnpj(profile?.cnpj)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-slate-500">Segmento:</span>
          <span className="font-semibold text-indigo-600">{segmentLabel(profile?.segment)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-slate-500">Teto anual MEI:</span>
          <span className="font-semibold text-emerald-600">
            {formatCurrencyBRL(profile?.customAnnualCap)}
          </span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
      >
        <Pencil className="w-4 h-4" />
        <span>Editar dados cadastrais</span>
      </button>
    </div>
  )
}
