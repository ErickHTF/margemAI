// Cabeçalho padrão das telas: ícone + nome do módulo, descrição abaixo e ações opcionais à direita
export default function PageHeader({ Icon, title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Icon className="w-7 h-7 text-indigo-600 shrink-0" />
          {title}
        </h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {children}
    </div>
  )
}
