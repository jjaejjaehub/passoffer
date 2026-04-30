'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { OrderStatus } from '@/types/channel'
import {
  STATUS_TRANSITIONS,
  STATUS_CONFIG,
  isTerminalStatus,
} from '../model/constants'
import {
  ChevronDown,
  Eye,
  ExternalLink,
  XCircle,
  RotateCcw,
  Pencil,
  Calendar,
} from 'lucide-react'
import type { Order } from '../model/types'
import { CHANNEL_NAMES } from '@/constants/channels'

interface ProcessOrderButtonProps {
  order: Order
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  onViewDetail: (orderId: string) => void
  onViewOriginal: (order: Order) => void
  onEditTracking?: () => void
  onEditShipDate?: () => void
}

export function ProcessOrderButton({
  order,
  onStatusChange,
  onViewDetail,
  onViewOriginal,
  onEditTracking,
  onEditShipDate,
}: ProcessOrderButtonProps) {
  const channelName = CHANNEL_NAMES[order.channelId]
  const allowedTransitions = STATUS_TRANSITIONS[order.status]
  const isTerminal = isTerminalStatus(order.status)

  // 터미널 상태면 버튼 미표시
  if (isTerminal) {
    return (
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onViewDetail(order.id)}>
              <Eye className="mr-2 size-4" />
              상세 보기
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewOriginal(order)}>
              <ExternalLink className="mr-2 size-4" />
              {channelName}에서 원본 보기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  // 주 액션: 첫 번째 허용된 전환 (취소, 반품 제외)
  const primaryTransition = allowedTransitions.find(
    (s) => s !== '취소' && s !== '반품'
  )
  const primaryConfig = primaryTransition
    ? STATUS_CONFIG[primaryTransition]
    : null

  // 보조 액션들
  const secondaryTransitions = allowedTransitions.filter(
    (s) => s !== primaryTransition
  )

  return (
    <div className="flex items-center justify-end gap-1">
      {primaryConfig && primaryTransition && (
        <Button
          size="sm"
          className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => onStatusChange(order.id, primaryTransition)}
        >
          {primaryConfig.nextLabel}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onViewDetail(order.id)}>
            <Eye className="mr-2 size-4" />
            상세 보기
          </DropdownMenuItem>

          {(onEditShipDate || onEditTracking) && (
            <>
              <DropdownMenuSeparator />
              {onEditShipDate && (
                <DropdownMenuItem onClick={onEditShipDate}>
                  <Calendar className="mr-2 size-4" />
                  발송 예정일 수정
                </DropdownMenuItem>
              )}
              {onEditTracking && (
                <DropdownMenuItem onClick={onEditTracking}>
                  <Pencil className="mr-2 size-4" />
                  운송장 수정
                </DropdownMenuItem>
              )}
            </>
          )}

          {secondaryTransitions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {secondaryTransitions.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => onStatusChange(order.id, status)}
                  className={
                    status === '취소'
                      ? 'text-red-600 focus:text-red-600'
                      : status === '반품'
                        ? 'text-rose-600 focus:text-rose-600'
                        : ''
                  }
                >
                  {status === '취소' ? (
                    <XCircle className="mr-2 size-4" />
                  ) : status === '반품' ? (
                    <RotateCcw className="mr-2 size-4" />
                  ) : null}
                  {status === '취소'
                    ? '주문 취소하기'
                    : status === '반품'
                      ? '반품 접수하기'
                      : STATUS_CONFIG[status].nextLabel}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onViewOriginal(order)}>
            <ExternalLink className="mr-2 size-4" />
            {channelName}에서 원본 보기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
