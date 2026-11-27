import { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Badge, Button, Card, IconButton, Notice } from './ui'

export default function EducationalPill({
  pill,
  defaultExpanded = false,
  allPills = [],
  onSelectPill = null
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (!pill) return null

  return (
    <Card data-testid="educational-pill" tone="indigo" className="text-slate-800">
      {allPills.length > 1 && onSelectPill && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3.5 pb-3 border-b border-indigo-100/70 text-[11px]">
          <span className="text-slate-400 font-medium mr-1">Tópicos SEBRAE:</span>
          {allPills.map((item) => {
            const isActive = item.id === pill.id
            return (
              <Button
                key={item.id}
                variant={isActive ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={isActive}
                onClick={() => onSelectPill(item.id)}
              >
                {item.categoryLabel || item.title}
              </Button>
            )
          })}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge tone="indigo">{pill.categoryLabel || 'Pílula SEBRAE'}</Badge>
            </div>
            <h4 className="text-sm font-semibold text-slate-900">{pill.title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{pill.summary}</p>
          </div>
        </div>

        <IconButton
          label={expanded ? 'Recolher detalhes' : 'Ver explicação completa'}
          Icon={expanded ? ChevronUp : ChevronDown}
          tone="indigo"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`pill-content-${pill.id}`}
        />
      </div>

      {expanded && (
        <div
          id={`pill-content-${pill.id}`}
          className="mt-3 pt-3 border-t border-indigo-100 text-xs space-y-2 animate-in fade-in-50 duration-200"
        >
          <p className="text-slate-700 leading-relaxed">{pill.content}</p>
          {pill.tip && (
            <Notice tone="indigo" size="sm" Icon={Sparkles} role="note" className="font-medium">
              <strong>Dica de ouro:</strong> {pill.tip}
            </Notice>
          )}
        </div>
      )}
    </Card>
  )
}
