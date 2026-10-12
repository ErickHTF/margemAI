import { useContext } from 'react'
import { CircleHelp } from 'lucide-react'
import { TourContext } from './TourContext'

// Cabeçalho padrão das telas: ícone + nome do módulo (com dica opcional), descrição abaixo e ações à direita
export default function PageHeader({ Icon, title, description, tip, children }) {
  const showTour = useContext(TourContext)
  return (
    <div data-tour="page-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Icon className="w-7 h-7 text-indigo-600 shrink-0" />
            {title}
          </h1>
          {tip}
        </div>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {(children || showTour) && <div className="flex flex-wrap items-center gap-2.5">
        {showTour && <button type="button" onClick={showTour} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 shrink-0"><CircleHelp className="h-4 w-4" />Como usar</button>}
        {children}
      </div>}
    </div>
  )
}
