import { useState, useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'
import EducationalPill from './EducationalPill'

export default function TipButton({ pill, allPills = [], onSelectPill = null }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const buttonRef = useRef(null)
  const popupRef = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const button = buttonRef.current
    popupRef.current?.focus({ preventScroll: true })
    let frame
    const measure = () => {
      const rect = buttonRef.current.getBoundingClientRect()
      const width = Math.min(416, window.innerWidth - 32)
      const height = Math.min(popupRef.current.scrollHeight, window.innerHeight - 32)
      const top = rect.bottom + 8 + height <= window.innerHeight - 16 ? rect.bottom + 8 : Math.max(16, rect.top - height - 8)
      setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top, width })
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const resize = new ResizeObserver(schedule)
    resize.observe(popupRef.current)
    const outside = event => {
      if (!popupRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) setOpen(false)
    }
    const keyDown = event => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keyDown)
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keyDown)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
      button?.focus({ preventScroll: true })
    }
  }, [open])

  if (!pill) return null
  const popup = open && <div ref={popupRef} id={id} role="dialog" aria-label={pill.title} tabIndex={-1}
    style={position ? { ...position, maxHeight: `calc(100dvh - ${position.top + 16}px)` } : { left: 16, right: 16, top: 16 }}
    className="fixed z-40 max-h-[calc(100dvh-2rem)] overflow-y-auto text-left shadow-xl rounded-2xl bg-white outline-none">
    <EducationalPill pill={pill} defaultExpanded allPills={allPills} onSelectPill={onSelectPill} />
  </div>
  return <span className="inline-flex">
    <button ref={buttonRef} type="button" onClick={() => setOpen(previous => !previous)} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog" aria-label={`Dica: ${pill.categoryLabel || pill.title}`} title="Ver dica"
      className={`p-1 rounded-full transition cursor-pointer ${open ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}>
      <HelpCircle key={pill.id} className="w-5 h-5 animate-tip-wiggle" />
    </button>
    {popup && (typeof document === 'undefined' ? popup : createPortal(popup, document.body))}
  </span>
}
