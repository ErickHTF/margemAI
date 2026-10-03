import { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export default function EducationalPill({ pill, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!pill) return null

  return (
    <div
      data-testid="educational-pill"
      className="bg-indigo-50/60 border border-indigo-100/80 rounded-2xl p-4 sm:p-5 text-slate-800 transition-all shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                {pill.categoryLabel || 'Pílula SEBRAE'}
              </span>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">{pill.title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{pill.summary}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white/80 transition cursor-pointer shrink-0"
          title={expanded ? 'Recolher detalhes' : 'Ver explicação completa'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-indigo-100 text-xs space-y-2 animate-in fade-in-50 duration-200">
          <p className="text-slate-700 leading-relaxed">{pill.content}</p>
          {pill.tip && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/90 border border-indigo-100 text-indigo-900 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dica de ouro:</strong> {pill.tip}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

