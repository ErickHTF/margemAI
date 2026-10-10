import { useState, useEffect } from 'react'
import { User, Pencil, AlertCircle, Loader2, Info } from 'lucide-react'
import profileService from '../services/profileService'
import segmentService from '../services/segmentService'
import { MEI_SEGMENTS } from '../constants/segments'
import { maskCnpj } from '../utils/validators'
import { formatCurrencyBRL, formatDateBR } from '../utils/formatters'
import useMeiCap from '../hooks/useMeiCap'
import PageHeader from './PageHeader'
import MeiCapIndicator from './MeiCapIndicator'
import ProfileForm from './ProfileForm'

const PROFILE_DESCRIPTION = 'Seus dados cadastrais calibram relatórios, alertas e o teto de faturamento MEI.'

const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

const ProfileField = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</dt>
    <dd className="mt-1 text-sm font-semibold text-slate-900 break-words">{children}</dd>
  </div>
)

export default function ProfilePanel({ user, onUserUpdate }) {
  const [profile, setProfile] = useState(null)
  const [segments, setSegments] = useState(MEI_SEGMENTS)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [meiCapReloadKey, setMeiCapReloadKey] = useState(0)
  const { meiCap, error: meiCapError } = useMeiCap(meiCapReloadKey)

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
    // O teto anual pode ter mudado
    setMeiCapReloadKey((key) => key + 1)
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

  const displayName = profile?.name || user?.name || ''

  return (
    <div className="w-full space-y-6">
      <PageHeader Icon={User} title="Meu Perfil" description={PROFILE_DESCRIPTION}>
        {profile && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all cursor-pointer self-start sm:self-auto"
          >
            <Pencil className="w-4 h-4" />
            <span>Editar dados cadastrais</span>
          </button>
        )}
      </PageHeader>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
          <span className="text-sm font-medium">Carregando seus dados...</span>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <p className="text-sm text-rose-600 font-medium">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 flex items-center gap-4 border-b border-slate-100">
              <div
                aria-hidden="true"
                className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-bold shrink-0"
              >
                {initialsOf(displayName) || <User className="w-7 h-7" />}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">Olá, {displayName}!</h2>
                <p className="text-xs text-slate-500">
                  Cliente desde {formatDateBR(profile?.createdAt)}
                </p>
              </div>
            </div>

            <dl className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <ProfileField label="Nome">{profile?.name}</ProfileField>
              <ProfileField label="E-mail">{profile?.email}</ProfileField>
              <ProfileField label="CNPJ">{maskCnpj(profile?.cnpj)}</ProfileField>
              <ProfileField label="Segmento">
                <span className="text-indigo-600">{segmentLabel(profile?.segment)}</span>
              </ProfileField>
              <ProfileField label="Teto anual MEI">
                <span className="text-emerald-600">{formatCurrencyBRL(profile?.customAnnualCap)}</span>
              </ProfileField>
              <ProfileField label="Última atualização">{formatDateBR(profile?.updatedAt)}</ProfileField>
            </dl>
          </div>

          {meiCap && <MeiCapIndicator data={meiCap} />}
          {meiCapError && (
            <p className="flex items-start gap-2 text-xs text-amber-700">
              <Info className="w-4 h-4 shrink-0 mt-px" />
              <span>{meiCapError}</span>
            </p>
          )}
        </>
      )}
    </div>
  )
}
