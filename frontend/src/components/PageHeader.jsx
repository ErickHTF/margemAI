import { useContext } from 'react'
import { CircleHelp } from 'lucide-react'
import { TourContext } from './TourContext'
import { Button } from './ui'

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
        {showTour && <Button variant="secondary" Icon={CircleHelp} onClick={showTour} className="shrink-0">Como usar</Button>}
        {children}
      </div>}
    </div>
  )
}
