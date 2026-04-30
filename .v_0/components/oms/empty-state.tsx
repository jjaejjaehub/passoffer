import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center',
        className
      )}
    >
      {/* B&W: bordered icon container */}
      <div className="mb-4 flex items-center justify-center size-12 rounded-lg border border-neutral-200">
        <Icon className="size-5 text-neutral-400" />
      </div>
      <h3 className="mb-1 text-sm font-medium text-neutral-900">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-neutral-400">{description}</p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          className="bg-neutral-900 hover:bg-neutral-700 text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
