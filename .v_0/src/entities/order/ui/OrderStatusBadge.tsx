'use client'

import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types/channel'
import { STATUS_CONFIG } from '../model/constants'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AlertTriangle } from 'lucide-react'

interface OrderStatusBadgeProps {
  status: OrderStatus
  isDelayed?: boolean
  className?: string
}

export function OrderStatusBadge({
  status,
  isDelayed = false,
  className,
}: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* B&W badge: uses border style for hierarchy */}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
          config.bgColor,
          config.textColor,
          config.borderColor,
          config.borderStyle
        )}
      >
        <Icon className="size-3" />
        {config.label}
      </span>
      {/* B&W: delayed icon is gray, not orange */}
      {isDelayed && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center">
                <AlertTriangle className="size-4 text-neutral-400" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>2시간 이상 미처리 주문입니다</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
