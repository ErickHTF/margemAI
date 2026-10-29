import { cx } from './cx'

const TONES = {
  white: 'bg-white border-slate-200',
  muted: 'bg-slate-50/60 border-slate-200',
  indigo: 'bg-indigo-50/60 border-indigo-100',
  emerald: 'bg-emerald-50 border-emerald-200',
  sky: 'bg-sky-50 border-sky-200',
  amber: 'bg-amber-50 border-amber-200',
  rose: 'bg-rose-50 border-rose-200'
}

const PADDINGS = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8'
}

export default function Card({ as: Component = 'div', tone = 'white', padding = 'md', inset = false, className, children, ...props }) {
  return (
    <Component
      className={cx(
        'border',
        inset ? 'rounded-xl' : 'rounded-2xl shadow-sm',
        TONES[tone],
        PADDINGS[padding],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}
