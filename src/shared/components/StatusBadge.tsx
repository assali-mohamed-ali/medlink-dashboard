import type { ReactNode } from 'react'
import { CircleCheck, CircleDashed, CircleX, Clock, Info } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/lib/utils'

/*
 * A status in words with an icon, never colour alone (PLAN.md §4.4). Built on shadcn's badge like the Watermelon status
 * badges (badge-12/13/15) it replaces; each tone is a pair checked by scripts/contrast.mjs.
 */
const TONES = {
  neutral: { icon: CircleDashed, className: 'bg-muted text-muted-foreground' },
  info: { icon: Info, className: 'bg-[var(--info-container)] text-foreground' },
  success: { icon: CircleCheck, className: 'bg-accent text-accent-foreground' },
  warning: { icon: Clock, className: 'bg-[var(--warning-container)] text-[var(--on-warning-container)]' },
  danger: { icon: CircleX, className: 'bg-[var(--error-container)] text-[var(--on-error-container)]' },
} as const

type Props = {
  tone?: keyof typeof TONES
  children: ReactNode
  className?: string
}

export default function StatusBadge({ tone = 'neutral', children, className }: Props) {
  const { icon: Icon, className: toneClass } = TONES[tone]
  return (
    <Badge className={cn('h-6 gap-1.5 border-none px-2.5 text-xs font-medium', toneClass, className)}>
      <Icon aria-hidden="true" />
      {children}
    </Badge>
  )
}
