'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChannelBadge } from '@/components/oms/channel-badge'
import { DEFAULT_CHANNELS, CHANNEL_NAMES } from '@/constants/channels'
import {
  OrderStatusBadge,
  ProcessOrderButton,
  type Order,
} from '@/src/entities/order'
import { ShipDateCell } from '@/src/shared/ui/ShipDateCell'
import { TrackingInputCell } from '@/src/shared/ui/TrackingInputCell'
import type { OrderStatus, ChannelId } from '@/types/channel'
import type { CarrierId } from '@/src/entities/delivery/model/types'
import { formatDistanceToNow, format, differenceInHours } from 'date-fns'
import { ko } from 'date-fns/locale'

interface OrderTableProps {
  orders: Order[]
  isLoading?: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
  onShipDateChange?: (orderId: string, shipDate: string | null) => void
  onTrackingSave?: (
    orderId: string,
    data: { carrierId: CarrierId; trackingNumber: string }
  ) => Promise<{ success: boolean; channelSyncFailed?: boolean }>
  lastSelectedIndex: number | null
  setLastSelectedIndex: (index: number | null) => void
  showChannelColumn?: boolean
  onOrderIdClick: (orderId: string) => void
}

function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`
}

function formatRelativeTime(date: Date): string {
  const hoursDiff = differenceInHours(new Date(), date)
  if (hoursDiff < 24) {
    return formatDistanceToNow(date, { addSuffix: true, locale: ko })
  }
  return format(date, 'yyyy.MM.dd')
}

function formatAbsoluteTime(date: Date): string {
  return format(date, 'yyyy.MM.dd a h:mm:ss', { locale: ko })
}

function isOrderDelayed(order: Order): boolean {
  if (order.status !== '신규') return false
  const hoursDiff = differenceInHours(new Date(), order.createdAt)
  return hoursDiff >= 2
}

function isNewOrder(date: Date): boolean {
  return differenceInHours(new Date(), date) < 24
}

// B&W row styles based on status - using gray borders only
function getRowStyle(status: OrderStatus): string {
  switch (status) {
    case '배송준비':
      return 'border-l-[3px] border-l-neutral-400 bg-neutral-50/50'
    case '배송중':
      return 'border-l-[3px] border-l-neutral-300'
    default:
      return ''
  }
}

export function OrderTable({
  orders,
  isLoading = false,
  selectedIds,
  onSelectionChange,
  onStatusChange,
  onShipDateChange,
  onTrackingSave,
  showChannelColumn = true,
  lastSelectedIndex,
  setLastSelectedIndex,
  onOrderIdClick,
}: OrderTableProps) {
  const [editingTrackingId, setEditingTrackingId] = useState<string | null>(null)
  const [shipDates, setShipDates] = useState<Record<string, string | null>>({})

  const isAllSelected =
    orders.length > 0 && selectedIds.length === orders.length
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < orders.length

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(orders.map((o) => o.id))
    } else {
      onSelectionChange([])
    }
  }

  const handleRowSelect = (
    orderId: string,
    index: number,
    event: React.MouseEvent
  ) => {
    const isSelected = selectedIds.includes(orderId)

    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+Click: Range selection
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const rangeIds = orders.slice(start, end + 1).map((o) => o.id)
      const newSelection = [...new Set([...selectedIds, ...rangeIds])]
      onSelectionChange(newSelection)
    } else {
      // Normal click: Toggle selection
      if (isSelected) {
        onSelectionChange(selectedIds.filter((id) => id !== orderId))
      } else {
        onSelectionChange([...selectedIds, orderId])
      }
      setLastSelectedIndex(index)
    }
  }

  const getChannelById = (channelId: ChannelId) => {
    return (
      DEFAULT_CHANNELS.find((c) => c.id === channelId) || DEFAULT_CHANNELS[0]
    )
  }

  const handleShipDateChange = useCallback(
    (orderId: string, date: string | null) => {
      setShipDates((prev) => ({ ...prev, [orderId]: date }))
      onShipDateChange?.(orderId, date)
    },
    [onShipDateChange]
  )

  const handleTrackingSave = useCallback(
    async (
      orderId: string,
      data: { carrierId: CarrierId; trackingNumber: string }
    ) => {
      if (onTrackingSave) {
        const result = await onTrackingSave(orderId, data)
        if (result.success) {
          setEditingTrackingId(null)
        }
        return result
      }
      return { success: false }
    },
    [onTrackingSave]
  )

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table style={{ minWidth: '1100px' }}>
          <TableHeader>
            {/* B&W: Gray header background */}
            <TableRow className="bg-neutral-50 hover:bg-neutral-50">
              <TableHead className="w-[40px] sticky left-0 bg-neutral-50 z-10">
                <Checkbox
                  checked={isIndeterminate ? 'indeterminate' : isAllSelected}
                  onCheckedChange={handleSelectAll}
                  // B&W: Black checkbox
                  className="data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                  aria-label="전체 선택"
                />
              </TableHead>
              <TableHead className="w-[130px] text-[11px] font-medium text-neutral-500">
                주문번호
              </TableHead>
              <TableHead className="min-w-[180px] text-[11px] font-medium text-neutral-500">
                상품명/옵션
              </TableHead>
              <TableHead className="w-[88px] text-[11px] font-medium text-neutral-500">
                구매자
              </TableHead>
              <TableHead className="w-[96px] text-right text-[11px] font-medium text-neutral-500">
                금액
              </TableHead>
              <TableHead className="w-[88px] text-[11px] font-medium text-neutral-500">
                상태
              </TableHead>
              <TableHead className="w-[120px] text-[11px] font-medium text-neutral-500">
                발송 예정일
              </TableHead>
              <TableHead className="w-[220px] text-[11px] font-medium text-neutral-500">
                운송장 번호
              </TableHead>
              <TableHead className="w-[80px] text-right text-[11px] font-medium text-neutral-500">
                처리
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order, index) => {
              const isSelected = selectedIds.includes(order.id)
              const channel = getChannelById(order.channelId)
              const isDelayed = isOrderDelayed(order)
              const isNew = isNewOrder(order.createdAt)
              const rowStyle = getRowStyle(order.status)
              const shipDate = shipDates[order.id] ?? null
              const canInputTracking = order.status === '배송준비' && shipDate
              const hasTracking = !!order.tracking

              return (
                <motion.tr
                  key={order.id}
                  layout
                  initial={false}
                  animate={{
                    // B&W: Selected uses light gray
                    backgroundColor: isSelected
                      ? 'rgb(250 250 250)'
                      : undefined,
                  }}
                  transition={{ duration: 0.2 }}
                  data-state={isSelected ? 'selected' : undefined}
                  className={cn(
                    'transition-colors border-b border-neutral-100',
                    rowStyle,
                    // B&W: Selected row with left border
                    isSelected &&
                      'bg-neutral-50 hover:bg-neutral-50 border-l-2 border-l-neutral-900'
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="relative sticky left-0 bg-inherit z-10">
                    {/* B&W: New order indicator is neutral */}
                    {isNew && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-neutral-400 rounded-r" />
                    )}
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => handleRowSelect(order.id, index, e)}
                      className="data-[state=checked]:bg-neutral-900 data-[state=checked]:border-neutral-900"
                      aria-label={`주문 ${order.id} 선택`}
                    />
                  </TableCell>

                  {/* Order ID with Channel Badge */}
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {showChannelColumn && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <ChannelBadge channel={channel} variant="icon-only" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {channel.name} 원본: {order.channelOrderId}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {/* B&W: Button with underline style */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOrderIdClick(order.id)
                            }}
                            className="font-mono text-sm text-neutral-900 underline decoration-neutral-300 hover:decoration-neutral-900 transition-colors text-left"
                          >
                            {order.channelOrderId}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {CHANNEL_NAMES[order.channelId]} 원본:{' '}
                            {order.channelOrderId}
                          </p>
                          <p className="text-xs text-neutral-400">
                            내부 ID: {order.id}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>

                  {/* Product Name & Options */}
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="max-w-[280px]">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {order.items[0]?.productName}
                          </p>
                          {order.items[0]?.option && (
                            <p className="text-xs text-neutral-500 truncate">
                              {order.items[0].option}
                            </p>
                          )}
                          {order.items.length > 1 && (
                            <Badge
                              variant="secondary"
                              className="mt-1 text-xs bg-neutral-100 text-neutral-600"
                            >
                              외 {order.items.length - 1}건
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          {order.items.map((item, i) => (
                            <p key={i} className="text-sm">
                              {item.productName}
                              {item.option && (
                                <span className="text-neutral-400">
                                  {' '}
                                  ({item.option})
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Buyer */}
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-neutral-700">
                          {order.buyer.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[240px]">
                        <div className="space-y-1 text-sm">
                          <p>전화번호: {order.shipping.phone}</p>
                          <p>
                            주소: {order.shipping.address1}{' '}
                            {order.shipping.address2}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium text-sm text-neutral-900">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1 text-sm">
                          <p>상품 합계: {formatCurrency(order.subtotal)}</p>
                          <p>배송비: {formatCurrency(order.shippingFee)}</p>
                          {order.discount > 0 && (
                            <p>할인: -{formatCurrency(order.discount)}</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <OrderStatusBadge
                      status={order.status}
                      isDelayed={isDelayed}
                    />
                  </TableCell>

                  {/* Ship Date */}
                  <TableCell>
                    {order.status === '배송준비' ? (
                      <ShipDateCell
                        orderId={order.id}
                        value={shipDate}
                        onChange={(date) => handleShipDateChange(order.id, date)}
                        onDateSelected={() => {
                          // Focus tracking input after date selection
                          setTimeout(() => {
                            document
                              .getElementById(`tracking-input-${order.id}`)
                              ?.focus()
                          }, 100)
                        }}
                      />
                    ) : order.status === '배송중' || order.status === '완료' ? (
                      <span className="text-sm text-neutral-500">
                        {order.tracking?.registeredAt
                          ? format(order.tracking.registeredAt, 'yyyy.MM.dd')
                          : '—'}
                      </span>
                    ) : (
                      <span className="text-sm text-neutral-400">—</span>
                    )}
                  </TableCell>

                  {/* Tracking Number */}
                  <TableCell>
                    {order.status === '배송준비' ? (
                      <TrackingInputCell
                        orderId={order.id}
                        channelId={order.channelId}
                        shipDate={shipDate}
                        onSave={(data) => handleTrackingSave(order.id, data)}
                        onCancel={() => setEditingTrackingId(null)}
                        forceEdit={editingTrackingId === order.id}
                      />
                    ) : hasTracking ? (
                      <TrackingInputCell
                        orderId={order.id}
                        channelId={order.channelId}
                        shipDate={null}
                        existingCarrierId={order.tracking!.carrierId}
                        existingTrackingNumber={order.tracking!.trackingNumber}
                        channelSyncStatus={
                          order.tracking!.sentToChannel ? 'success' : 'failed'
                        }
                        onSave={(data) => handleTrackingSave(order.id, data)}
                        onCancel={() => setEditingTrackingId(null)}
                        forceEdit={editingTrackingId === order.id}
                      />
                    ) : (
                      <span className="text-sm text-neutral-400">—</span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <ProcessOrderButton
                      order={order}
                      onStatusChange={onStatusChange}
                      onViewDetail={() => onOrderIdClick(order.id)}
                      onViewOriginal={(o) => {
                        const baseUrl =
                          o.channelId === 'rakuten'
                            ? 'https://order.rms.rakuten.co.jp/'
                            : 'https://www.qoo10.jp/order/'
                        window.open(`${baseUrl}${o.channelOrderId}`, '_blank')
                      }}
                      onEditTracking={
                        hasTracking
                          ? () => setEditingTrackingId(order.id)
                          : undefined
                      }
                    />
                  </TableCell>
                </motion.tr>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
