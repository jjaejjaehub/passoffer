'use client'

import Link from 'next/link'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChannelBadge } from '@/components/oms/channel-badge'
import { DEFAULT_CHANNELS, CHANNEL_NAMES } from '@/constants/channels'
import {
  OrderStatusBadge,
  ProcessOrderButton,
  STATUS_CONFIG,
  CARRIERS,
  type Order,
} from '@/src/entities/order'
import type { OrderStatus, ChannelId } from '@/types/channel'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Check,
  Clock,
  User,
  Package,
  MapPin,
  CreditCard,
  Truck,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface OrderQuickDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: Order | null
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void
}

function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`
}

function formatDateTime(date: Date): string {
  return format(date, 'yyyy.MM.dd a h:mm', { locale: ko })
}

export function OrderQuickDrawer({
  open,
  onOpenChange,
  order,
  onStatusChange,
}: OrderQuickDrawerProps) {
  const [copiedTracking, setCopiedTracking] = useState(false)

  if (!order) return null

  const channel =
    DEFAULT_CHANNELS.find((c) => c.id === order.channelId) || DEFAULT_CHANNELS[0]

  const handleCopyTracking = async () => {
    if (order.tracking?.trackingNumber) {
      await navigator.clipboard.writeText(order.tracking.trackingNumber)
      setCopiedTracking(true)
      toast.success('송장번호가 복사되었습니다')
      setTimeout(() => setCopiedTracking(false), 2000)
    }
  }

  const carrierName =
    CARRIERS.find((c) => c.id === order.tracking?.carrierId)?.name || '기타'

  // Get last 3 history events
  const recentHistory = [...order.history]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 3)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] overflow-y-auto"
      >
        <SheetHeader className="space-y-3">
          {/* Detail Page Link */}
          <Link
            href={`/orders/${order.id}`}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            상세 페이지로 이동
            <ArrowRight className="size-4" />
          </Link>

          <SheetTitle className="text-left">주문 상세</SheetTitle>
          <SheetDescription>
            주문 정보, 배송지, 처리 이력을 확인합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Order Header */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-lg font-semibold">
                {order.id}
              </span>
              <OrderStatusBadge status={order.status} />
              <ChannelBadge channel={channel} variant="pill" />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Clock className="size-4" />
                {formatDateTime(order.createdAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <CreditCard className="size-4" />
                {order.paymentMethod}
              </div>
              <div className="font-medium text-slate-900">
                {formatCurrency(order.totalAmount)}
              </div>
            </div>
          </section>

          <Separator />

          {/* Section 2: Order Items */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Package className="size-4" />
              주문 상품
            </h3>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs">상품명/옵션</TableHead>
                  <TableHead className="text-xs text-center w-16">
                    수량
                  </TableHead>
                  <TableHead className="text-xs text-right w-24">
                    금액
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.productName}
                        </p>
                        {item.option && (
                          <p className="text-xs text-slate-500">{item.option}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-2">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50">
                  <TableCell colSpan={2} className="py-2 font-medium">
                    합계
                  </TableCell>
                  <TableCell className="text-right py-2 font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>

          <Separator />

          {/* Section 3: Shipping Address */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <MapPin className="size-4" />
              배송지
            </h3>
            <div className="rounded-md border bg-slate-50 p-3 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <User className="size-4 text-slate-400" />
                <span className="font-medium">{order.shipping.recipient}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">{order.shipping.phone}</span>
              </div>
              <p className="text-slate-600 pl-6">
                ({order.shipping.zipCode}) {order.shipping.address1}{' '}
                {order.shipping.address2}
              </p>
              {order.shipping.deliveryMemo && (
                <p className="text-slate-500 italic pl-6 text-xs">
                  배송 메모: {order.shipping.deliveryMemo}
                </p>
              )}
            </div>
          </section>

          <Separator />

          {/* Section 4: Actions */}
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium text-slate-900">
              <Truck className="size-4" />
              처리 액션
            </h3>

            {order.tracking ? (
              // Already shipped - show tracking info
              <div className="rounded-md border bg-green-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">
                    배송 정보
                  </span>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                    배송중
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">{carrierName}</span>
                  <span className="font-mono text-sm font-medium">
                    {order.tracking.trackingNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={handleCopyTracking}
                  >
                    {copiedTracking ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <Link
                  href={`https://tracker.delivery/kr/${order.tracking.carrierId}/${order.tracking.trackingNumber}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                >
                  배송 추적하기
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            ) : (
              // Not shipped - show action button
              <ProcessOrderButton
                order={order}
                onStatusChange={onStatusChange}
                onViewDetail={() => {}}
                onViewOriginal={(o) => {
                  window.open(
                    `https://www.qoo10.jp/order/${o.channelOrderId}`,
                    '_blank'
                  )
                }}
              />
            )}
          </section>

          <Separator />

          {/* Section 5: History Timeline */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-900">처리 이력</h3>
              <Link
                href={`/orders/${order.id}#history`}
                className="text-xs text-indigo-600 hover:underline"
              >
                전체 이력 보기
              </Link>
            </div>
            <div className="space-y-3">
              {recentHistory.map((event, i) => {
                const config = STATUS_CONFIG[event.status]
                const Icon = config.icon
                return (
                  <div key={event.id} className="flex gap-3">
                    <div
                      className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${config.bgColor}`}
                    >
                      <Icon className={`size-4 ${config.textColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {config.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(event.timestamp, 'yyyy.MM.dd HH:mm')} ·{' '}
                        {event.actor}
                      </p>
                      {event.note && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
