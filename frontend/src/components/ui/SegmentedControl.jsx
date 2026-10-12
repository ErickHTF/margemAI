import { cx } from './cx'

const SIZES = {
  sm: { item: 'gap-1.5 px-3 py-1.5 text-xs', icon: 'h-3.5 w-3.5' },
  md: { item: 'min-h-11 gap-2 px-4 py-2 text-sm', icon: 'h-4 w-4' }
}

export default function SegmentedControl({ options, value, onChange, size = 'sm', label, className, ...props }) {
  return (
    <div role="group" aria-label={label} className={cx('inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1', className)} {...props}>
      {options.map(option => {
        const selected = option.value === value
        const OptionIcon = option.Icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              SIZES[size].item,
              selected ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {OptionIcon && <OptionIcon aria-hidden="true" className={SIZES[size].icon} />}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
