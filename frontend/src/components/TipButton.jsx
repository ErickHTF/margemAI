import { useState, useEffect, useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import EducationalPill from './EducationalPill'

// Botão "?" discreto que abre a pílula SEBRAE em um popover.
// O ícone balança ao entrar na tela e sempre que a dica sugerida muda.
export default function TipButton({ pill, allPills = [], onSelectPill = null }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!pill) return null

  return (
    <span ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Dica: ${pill.categoryLabel || pill.title}`}
        title="Ver dica"
        className={`p-1 rounded-full transition cursor-pointer ${
          open ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
        }`}
      >
        {/* key reinicia a animação quando a dica contextual muda */}
        <HelpCircle key={pill.id} className="w-5 h-5 animate-tip-wiggle" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={pill.title}
          className="absolute left-0 top-full mt-2 z-30 w-[min(26rem,calc(100vw-2rem))] text-left shadow-xl rounded-2xl bg-white"
        >
          <EducationalPill pill={pill} defaultExpanded allPills={allPills} onSelectPill={onSelectPill} />
        </div>
      )}
    </span>
  )
}
