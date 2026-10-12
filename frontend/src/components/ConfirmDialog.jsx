import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel
}) {
  const cancelRef = useRef(null)
  const dialogRef = useRef(null)
  const overlayRef = useRef(null)
  const id = useId()
  const cancelAction = useRef(onCancel)
  useEffect(() => { cancelAction.current = onCancel }, [onCancel])

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const backgrounds = [...document.body.children].filter(node => !node.contains(overlayRef.current))
    const previousInert = backgrounds.map(node => node.inert)
    backgrounds.forEach(node => { node.inert = true })
    cancelRef.current?.focus()
    const handleKeyDown = event => {
      if (event.key === 'Escape') { event.stopPropagation(); cancelAction.current() }
      if (event.key !== 'Tab') return
      const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const containFocus = event => {
      if (!dialogRef.current?.contains(event.target)) cancelRef.current?.focus()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', containFocus)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', containFocus)
      backgrounds.forEach((node, index) => { node.inert = previousInert[index] })
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  const content = (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 id={`${id}-title`} className="text-base font-bold text-slate-900">
              {title}
            </h2>
            <p id={`${id}-message`} className="text-sm text-slate-600 mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
  return typeof document === 'undefined' ? content : createPortal(content, document.body)
}
