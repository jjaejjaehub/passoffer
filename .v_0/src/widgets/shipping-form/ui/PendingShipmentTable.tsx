'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { Order } from '@/src/entities/order'
import { ChannelBadge } from '@/components/oms/channel-badge'
import { DEFAULT_CHANNELS } from '@/constants/channels'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'

interface PendingShipmentTableProps {
  orders: Order[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onProcessClick: (orderId: string) => void
  onRowRemove?: (orderId: string) => void
}

export function PendingShipmentTable({
  orders,
  selectedIds,
  onSelectionChange,
  onProcessClick,
  onRowRemove,
}: PendingShipmentTableProps) {
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null)

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        onSelectionChange(orders.map((o) => o.id))
      } else {
        onSelectionChange([])
      }
    },
    [orders, onSelectionChange]
  )

  const handleRowSelect = useCallback(
    (orderId: string, index: number, shiftKey: boolean) => {
      if (shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, index)
        const end = Math.max(lastClickedIndex, index)
        const rangeIds = orders.slice(start, end + 1).map((o) => o.id)
        const newSelection = new Set([...selectedIds, ...rangeIds])
        onSelectionChange(Array.from(newSelection))
      } else {
        if (selectedIds.includes(orderId)) {
          onSelectionChange(selectedIds.filter((id) => id !== orderId))
        } else {
          onSelectionChange([...selectedIds, orderId])
        }
      }
      setLastClickedIndex(index)
    },
    [orders, selectedIds, lastClickedIndex, onSelectionChange]
  )

  const isAllSelected = orders.length > 0 && selectedIds.length === orders.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < orders.length

  // 시/도만 추출
  const extractRegion = (address: string) => {
    const match = address.match(/^(서울|경기|부산|인천|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)/)
    return match ? match[1] : '-'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
        <span className="text-sm font-semibold text-slate-700">
          배송 처리 대기 중 <span className="text-indigo-600">{orders.length}건</span>
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <Checkbox
              checked={isIndeterminate ? 'indeterminate' : isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            전체 선택
          </label>
          <Button
            size="sm"
            disabled={selectedIds.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            선택한 {selectedIds.length}건 처리
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow className="border-b border-slate-200">
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-32">주문번호</TableHead>
              <TableHead>상품명</TableHead>
              <TableHead className="w-16 text-center">수량</TableHead>
              <TableHead className="w-24">주문일</TableHead>
              <TableHead className="w-20">구매자</TableHead>
              <TableHead className="w-16">배송지</TableHead>
              <TableHead className="w-20 text-center">처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {orders.map((order, index) => {
                const isSelected = selectedIds.includes(order.id)
                const channel = DEFAULT_CHANNELS.find((c) => c.id === order.channelId)

                return (
                  <motion.tr
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    className={cn(
                      'border-b border-slate-100 cursor-pointer transition-colors',
                      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    )}
                    onClick={(e) => handleRowSelect(order.id, index, e.shiftKey)}
                  >
                    <TableCell className="pl-4">
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => handleRowSelect(order.id, index, false)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {channel && <ChannelBadge channel={channel} variant="icon-only" />}
                        <span className="font-mono text-xs text-slate-600">
                          {order.channelOrderId.slice(-8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {order.items[0].productName}
                        </p>
                        {order.items[0].option && (
                          <p className="text-xs text-slate-500 truncate">
                            {order.items[0].option}
                          </p>
                        )}
                        {order.items.length > 1 && (
                          <p className="text-xs text-slate-400">
                            외 {order.items.length - 1}건
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {order.totalQuantity}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(order.createdAt, 'MM.dd', { locale: ko })}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {order.buyer.name}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {extractRegion(order.shipping.address1)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          onProcessClick(order.id)
                        }}
                      >
                        처리하기
                      </Button>
                    </TableCell>
                  </motion.tr>
                )
              })}
            </AnimatePresence>
          </TableBody>
        </Table>

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p className="text-lg font-medium">배송 대기 중인 주문이 없습니다</p>
            <p className="text-sm mt-1">주문이 배송준비 상태가 되면 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
