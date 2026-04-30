import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/channel'

// B&W status styles with border differentiation for hierarchy
const STATUS_STYLES: Record<
  OrderStatus,
  { bgColor: string; textColor: string; border: string }
> = {
  신규: {
    bgColor: 'bg-neutral-900',
    textColor: 'text-white',
    border: 'border-transparent',
  },
  처리중: {
    bgColor: 'bg-white',
    textColor: 'text-neutral-900',
    border: 'border-neutral-900',
  },
  배송준비: {
    bgColor: 'bg-white',
    textColor: 'text-neutral-700',
    border: 'border-neutral-400',
  },
  배송중: {
    bgColor: 'bg-neutral-100',
    textColor: 'text-neutral-700',
    border: 'border-neutral-300',
  },
  완료: {
    bgColor: 'bg-white',
    textColor: 'text-neutral-400',
    border: 'border-neutral-200',
  },
  취소: {
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-400',
    border: 'border-neutral-300 border-dashed',
  },
  반품: {
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-400',
    border: 'border-neutral-300 border-dashed',
  },
}

interface StatusBadgeProps {
  status: OrderStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_STYLES[status]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border',
        config.bgColor,
        config.textColor,
        config.border,
        className
      )}
    >
      {status}
    </span>
  )
}
