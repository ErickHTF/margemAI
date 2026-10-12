import { Loader2 } from 'lucide-react'
import { cx } from './cx'

export default function EmptyState({ Icon, title, description, action, tone = 'slate', loading = false, className }) {
  const ShownIcon = loading ? Loader2 : Icon
  return (
    <div
      role={loading ? 'status' : tone === 'rose' ? 'alert' : undefined}
      className={cx('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      {ShownIcon && (
        <ShownIcon
          aria-hidden="true"
          className={cx('mb-3 h-10 w-10', loading ? 'h-8 w-8 animate-spin text-indigo-600' : tone === 'rose' ? 'text-rose-500' : 'text-slate-300')}
        />
      )}
      {title && <p className={cx('text-sm font-semibold', tone === 'rose' ? 'text-rose-600' : 'text-slate-700')}>{title}</p>}
      {description && <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
