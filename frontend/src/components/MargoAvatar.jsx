import { Sparkles } from 'lucide-react'

const SIZES = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-14 w-14' }
const ICONS = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' }

export default function MargoAvatar({ size = 'sm', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/30 ${SIZES[size]} ${className}`}
    >
      <Sparkles className={ICONS[size]} />
    </span>
  )
}
