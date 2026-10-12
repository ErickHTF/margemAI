import { cloneElement, isValidElement, useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cx } from './cx'
import { Input, Select, Textarea } from './controls'

const CONTROLS = new Set([Input, Select, Textarea, 'input', 'select', 'textarea'])

const LABEL_SIZES = {
  sm: 'mb-1 text-xs font-semibold',
  md: 'mb-1.5 text-sm font-medium'
}

export default function Field({ label, hint, error, size = 'md', htmlFor, className, children, ...props }) {
  const generatedId = useId()
  const control = isValidElement(children) && CONTROLS.has(children.type) ? children : null
  const id = control?.props.id ?? htmlFor ?? generatedId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [control?.props['aria-describedby'], errorId, hintId].filter(Boolean).join(' ') || undefined
  return (
    <div className={className} {...props}>
      {label && <label htmlFor={id} className={cx('block text-slate-700', LABEL_SIZES[size])}>{label}</label>}
      {control
        ? cloneElement(control, { id, 'aria-invalid': error ? true : control.props['aria-invalid'], 'aria-describedby': describedBy })
        : children}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {hint && <div id={hintId} className="mt-1.5 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}
