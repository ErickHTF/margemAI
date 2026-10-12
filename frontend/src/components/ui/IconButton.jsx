import { cx } from './cx'

const TONES = {
  slate: 'hover:bg-slate-100 hover:text-slate-700',
  indigo: 'hover:bg-indigo-50 hover:text-indigo-600',
  emerald: 'hover:bg-emerald-50 hover:text-emerald-600',
  amber: 'hover:bg-amber-50 hover:text-amber-600',
  rose: 'hover:bg-rose-50 hover:text-rose-600'
}

const SIZES = { sm: 'p-1.5', md: 'p-2', lg: 'p-2.5' }
const ICON_SIZES = { sm: 'h-4 w-4', md: 'h-4 w-4', lg: 'h-5 w-5' }

export default function IconButton({ label, Icon, tone = 'slate', size = 'sm', type = 'button', title, className, ...props }) {
  if (!label) throw new Error('IconButton precisa de um label acessível.')
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg text-slate-400 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
        TONES[tone],
        SIZES[size],
        className
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={ICON_SIZES[size]} />
    </button>
  )
}
