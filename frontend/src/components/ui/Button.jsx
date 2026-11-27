import { Loader2 } from 'lucide-react'
import { cx } from './cx'

const VARIANTS = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50',
  soft: 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  link: 'text-indigo-600 hover:text-indigo-800'
}

const SIZES = {
  sm: 'gap-1.5 px-3 py-1.5 text-xs',
  md: 'min-h-11 gap-2 px-4 py-2.5 text-sm'
}

const LINK_SIZES = {
  sm: 'gap-1 text-xs',
  md: 'gap-1.5 text-sm'
}

const ICON_SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4' }

export default function Button({
  variant = 'primary',
  size = 'md',
  Icon,
  TrailingIcon,
  loading = false,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  ...props
}) {
  const ShownIcon = loading ? Loader2 : Icon
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        variant === 'link' ? LINK_SIZES[size] : SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {ShownIcon && <ShownIcon aria-hidden="true" className={cx(ICON_SIZES[size], 'shrink-0', loading && 'animate-spin')} />}
      {children}
      {TrailingIcon && !loading && <TrailingIcon aria-hidden="true" className={cx(ICON_SIZES[size], 'shrink-0')} />}
    </button>
  )
}
