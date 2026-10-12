import { cx, hasWidth } from './cx'

const SIZES = {
  sm: { box: 'py-1.5 text-xs', left: 'pl-2.5', right: 'pr-2.5', leftAdorned: 'pl-8', rightAdorned: 'pr-8', inset: 'px-2.5', icon: 'h-3.5 w-3.5' },
  md: { box: 'min-h-11 py-2.5 text-sm', left: 'pl-3.5', right: 'pr-3.5', leftAdorned: 'pl-10', rightAdorned: 'pr-10', inset: 'px-3.5', icon: 'h-4 w-4' }
}

const controlClass = ({ size, invalid, readOnly, leading, trailing, className }) => {
  const sizing = SIZES[size]
  return cx(
    'rounded-xl border text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
    readOnly ? 'bg-slate-100 text-slate-600' : 'bg-slate-50/50',
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100',
    sizing.box,
    leading ? sizing.leftAdorned : sizing.left,
    trailing ? sizing.rightAdorned : sizing.right,
    !hasWidth(className) && 'w-full',
    className
  )
}

const Adornment = ({ side, size, children }) => (
  <span
    aria-hidden="true"
    className={cx(
      'pointer-events-none absolute inset-y-0 flex items-center font-medium text-slate-400',
      side === 'left' ? 'left-0' : 'right-0',
      SIZES[size].inset,
      size === 'sm' ? 'text-xs' : 'text-sm'
    )}
  >
    {children}
  </span>
)

const withAdornments = (Element, { size = 'md', Icon, prefix, suffix, TrailingIcon, action, className, ...props }) => {
  const leading = Icon || prefix
  const trailing = TrailingIcon || suffix || action
  const control = (
    <Element
      {...props}
      className={controlClass({
        size,
        invalid: props['aria-invalid'] === true || props['aria-invalid'] === 'true',
        readOnly: props.readOnly,
        leading,
        trailing,
        className: leading || trailing ? undefined : className
      })}
    />
  )
  if (!leading && !trailing) return control
  const iconClass = SIZES[size].icon
  return (
    <div className={cx('relative', className)}>
      {leading && <Adornment side="left" size={size}>{Icon ? <Icon className={iconClass} /> : prefix}</Adornment>}
      {control}
      {(TrailingIcon || suffix) && <Adornment side="right" size={size}>{TrailingIcon ? <TrailingIcon className={iconClass} /> : suffix}</Adornment>}
      {action && <span className="absolute inset-y-0 right-0 flex items-center pr-1.5">{action}</span>}
    </div>
  )
}

export function Input(props) {
  return withAdornments('input', props)
}

export function Select({ children, ...props }) {
  return withAdornments('select', { ...props, children })
}

export function Textarea(props) {
  return withAdornments('textarea', props)
}

export function Checkbox({ className, ...props }) {
  return (
    <input
      type="checkbox"
      className={cx('h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-60', className)}
      {...props}
    />
  )
}
