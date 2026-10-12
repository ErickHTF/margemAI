import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Lightbulb, X } from 'lucide-react'
import { positionTour } from '../utils/tourPosition'

export default function GuidedTour({ steps, rootRef, onClose }) {
  const [step, setStep] = useState(0)
  const [layout, setLayout] = useState(null)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const maskId = useId()
  const current = steps[step]

  useEffect(() => {
    const previousFocus = document.activeElement
    closeRef.current?.focus({ preventScroll: true })
    const handleKey = event => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const containFocus = event => {
      if (!dialogRef.current?.contains(event.target)) closeRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener('focusin', containFocus)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('focusin', containFocus)
      document.removeEventListener('keydown', handleKey)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [onClose])

  useEffect(() => {
    let frame
    let observedTarget
    let scrolledTarget
    const root = rootRef.current
    const measure = () => {
      const target = root?.querySelector(`[data-tour="${current.target}"]`) || root?.querySelector('[data-tour="page-header"]')
      if (target !== observedTarget) {
        if (observedTarget) resize.unobserve(observedTarget)
        if (target) resize.observe(target)
        observedTarget = target
      }
      const viewport = { width: window.innerWidth, height: window.innerHeight }
      const rect = target?.getBoundingClientRect()
      if (target && target !== scrolledTarget) {
        scrolledTarget = target
        if (rect.top < 24 || rect.bottom > viewport.height - 24) {
          target.scrollIntoView({ block: rect.height > viewport.height / 2 ? 'start' : 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
        }
      }
      const next = positionTour(rect?.width && rect?.height ? rect : null, viewport, (dialogRef.current?.scrollHeight || 248) + 2)
      setLayout(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure) }
    const resize = new ResizeObserver(schedule)
    if (root) resize.observe(root)
    resize.observe(dialogRef.current)
    const mutation = new MutationObserver(schedule)
    if (root) mutation.observe(root, { childList: true, subtree: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutation.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, true)
    }
  }, [current.target, rootRef])

  const spot = layout?.spotlight
  const content = <div className="fixed inset-0 z-50 isolate">
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs><mask id={maskId}><rect width="100%" height="100%" fill="white" />{spot && <rect x={spot.left} y={spot.top} width={spot.width} height={spot.height} rx="16" fill="black" />}</mask></defs>
      <rect width="100%" height="100%" fill="rgb(15 23 42 / 0.62)" mask={`url(#${maskId})`} />
      {spot && <rect x={spot.left} y={spot.top} width={spot.width} height={spot.height} rx="16" fill="none" stroke="#a5b4fc" strokeWidth="3" />}
    </svg>
    <div className="absolute inset-0" aria-hidden="true" />
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="guided-tour-title" aria-describedby={current.benefit ? 'guided-tour-text guided-tour-benefit' : 'guided-tour-text'}
      style={layout ? { left: layout.left, top: layout.top, width: layout.width, maxHeight: `calc(100dvh - ${layout.top + 16}px)` } : undefined}
      className={`fixed max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-indigo-100 bg-white p-5 shadow-2xl shadow-slate-950/20 motion-safe:transition-[top,left] motion-safe:duration-200 ${layout ? '' : 'bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[340px]'}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-indigo-600">Vamos explorar · {step + 1}/{steps.length}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Fechar guia" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
      </div>
      <div aria-live="polite" aria-atomic="true" className="mt-2">
        <h2 id="guided-tour-title" className="text-lg font-bold tracking-tight text-slate-900">{current.title}</h2>
        <p id="guided-tour-text" className="mt-1.5 text-sm leading-relaxed text-slate-600">{current.text}</p>
        {current.benefit && <p id="guided-tour-benefit" className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-indigo-700"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{current.benefit}</p>}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => step ? setStep(step - 1) : onClose()} className="inline-flex items-center gap-1 rounded-full px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50">{step > 0 && <ArrowLeft className="h-3.5 w-3.5" />}{step ? 'Voltar' : 'Pular guia'}</button>
        <button type="button" onClick={() => step === steps.length - 1 ? onClose() : setStep(step + 1)} className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">{step === steps.length - 1 ? 'Pronto!' : 'Próximo'}<ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  </div>
  return typeof document === 'undefined' ? content : createPortal(content, document.body)
}
