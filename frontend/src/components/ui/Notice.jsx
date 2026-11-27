import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cx } from './cx'

const TONES = {
  emerald: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: 'text-emerald-600', Icon: CheckCircle2 },
  sky: { box: 'bg-sky-50 border-sky-200 text-sky-800', icon: 'text-sky-600', Icon: Info },
  amber: { box: 'bg-amber-50 border-amber-200 text-amber-800', icon: 'text-amber-600', Icon: AlertTriangle },
  rose: { box: 'bg-rose-50 border-rose-200 text-rose-800', icon: 'text-rose-600', Icon: XCircle },
  indigo: { box: 'bg-indigo-50 border-indigo-200 text-indigo-800', icon: 'text-indigo-600', Icon: Info },
  slate: { box: 'bg-slate-50 border-slate-200 text-slate-700', icon: 'text-slate-500', Icon: Info }
}

const SIZES = {
  sm: { box: 'gap-2 p-3 text-xs', icon: 'h-4 w-4' },
  md: { box: 'gap-3 p-4 text-sm', icon: 'h-5 w-5' }
}

export default function Notice({ tone = 'sky', size = 'md', title, Icon, role, className, children, ...props }) {
  const style = TONES[tone]
  const ShownIcon = Icon || style.Icon
  return (
    <div
      role={role ?? (tone === 'rose' ? 'alert' : 'status')}
      className={cx('flex items-start rounded-xl border', style.box, SIZES[size].box, className)}
      {...props}
    >
      {ShownIcon && <ShownIcon aria-hidden="true" className={cx('mt-0.5 shrink-0', style.icon, SIZES[size].icon)} />}
      <div className="min-w-0 flex-1 leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  )
}
