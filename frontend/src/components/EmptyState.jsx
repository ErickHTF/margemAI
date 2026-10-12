export default function EmptyState({ Icon, title, description, children }) {
  return (
    <div className="p-8 sm:p-12 text-center">
      {Icon && <Icon aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-3" />}
      <p className="text-base font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-sm text-slate-500">{description}</p>
      {children && <div className="mt-4 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}

export function EmptyStateAction({ onClick, children, secondary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        secondary
          ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }`}
    >
      {children}
    </button>
  )
}
