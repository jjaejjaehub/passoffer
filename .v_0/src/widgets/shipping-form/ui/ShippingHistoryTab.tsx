'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'
import { Search, Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ShippingHistory, CarrierId, ChannelSyncStatus } from '@/src/entities/delivery'
import { CARRIER_CONFIG, SYNC_STATUS_CONFIG } from '@/src/entities/delivery'
import { DEFAULT_CHANNELS } from '@/constants/channels'
import { ChannelBadge } from '@/components/oms/channel-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ResendTrackingButton } from '@/src/features/sync-channel/ui/ResendTrackingButton'

interface ShippingHistoryTabProps {
  history: ShippingHistory[]
  onResend: (historyId: string) => Promise<void>
}

export function ShippingHistoryTab({ history, onResend }: ShippingHistoryTabProps) {
  const [dateRange, setDateRange] = useState<'오늘' | '7일' | '30일'>('7일')
  const [carrierFilter, setCarrierFilter] = useState<CarrierId | 'all'>('all')
  const [syncStatusFilter, setSyncStatusFilter] = useState<ChannelSyncStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter history
  const filteredHistory = history.filter((item) => {
    if (carrierFilter !== 'all' && item.carrierId !== carrierFilter) return false
    if (syncStatusFilter !== 'all' && item.channelSyncStatus !== syncStatusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        item.orderId.toLowerCase().includes(query) ||
        item.trackingNumber.toLowerCase().includes(query)
      )
    }
    return true
  })

  const handleExcelDownload = () => {
    // Simulate download
    alert('엑셀 다운로드 기능 (시뮬레이션)')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-slate-200 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range buttons */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['오늘', '7일', '30일'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  dateRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Carrier filter */}
          <Select
            value={carrierFilter}
            onValueChange={(value) => setCarrierFilter(value as CarrierId | 'all')}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="택배사" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 택배사</SelectItem>
              {Object.entries(CARRIER_CONFIG).map(([id, config]) => (
                <SelectItem key={id} value={id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sync status filter */}
          <Select
            value={syncStatusFilter}
            onValueChange={(value) => setSyncStatusFilter(value as ChannelSyncStatus | 'all')}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="전송 상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="success">전송 완료</SelectItem>
              <SelectItem value="failed">전송 실패</SelectItem>
              <SelectItem value="pending">전송 중</SelectItem>
              <SelectItem value="not_sent">미전송</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주문번호, 송장번호 검색"
              className="pl-9 w-52"
            />
          </div>
        </div>

        {/* Excel download */}
        <Button variant="outline" onClick={handleExcelDownload}>
          <Download className="size-4 mr-2" />
          엑셀 다운로드
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead className="w-40">처리일시</TableHead>
              <TableHead className="w-32">주문번호</TableHead>
              <TableHead className="w-12">채널</TableHead>
              <TableHead className="w-28">택배사</TableHead>
              <TableHead className="w-36">송장번호</TableHead>
              <TableHead className="w-20">처리자</TableHead>
              <TableHead className="w-28">Qoo10 전송</TableHead>
              <TableHead className="w-20">재전송</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHistory.map((item) => {
              const channel = DEFAULT_CHANNELS.find((c) => c.id === item.channelId)
              const carrierConfig = CARRIER_CONFIG[item.carrierId]
              const syncConfig = SYNC_STATUS_CONFIG[item.channelSyncStatus]

              return (
                <TableRow key={item.id}>
                  <TableCell className="text-sm text-slate-600">
                    {format(item.processedAt, 'yyyy.MM.dd a h:mm', { locale: ko })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/orders/${item.orderId}`}
                      className="font-mono text-xs text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                      {item.channelOrderId.slice(-10)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {channel && <ChannelBadge channel={channel} variant="icon-only" />}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'font-normal',
                        carrierConfig.color === 'blue' && 'bg-blue-100 text-blue-700',
                        carrierConfig.color === 'red' && 'bg-red-100 text-red-700',
                        carrierConfig.color === 'yellow' && 'bg-yellow-100 text-yellow-800',
                        carrierConfig.color === 'orange' && 'bg-orange-100 text-orange-700',
                        carrierConfig.color === 'gray' && 'bg-slate-100 text-slate-600'
                      )}
                    >
                      {carrierConfig.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-slate-700">
                    {item.trackingNumber}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {item.processedBy}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            {item.channelSyncStatus === 'pending' ? (
                              <Loader2 className="size-3 animate-spin text-amber-500" />
                            ) : null}
                            <Badge
                              className={cn(
                                'font-normal',
                                syncConfig.bgColor,
                                syncConfig.textColor
                              )}
                            >
                              {syncConfig.label}
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.channelSyncStatus === 'success' && item.channelSyncAt && (
                            <span>전송 시각: {format(item.channelSyncAt, 'MM.dd a h:mm', { locale: ko })}</span>
                          )}
                          {item.channelSyncStatus === 'failed' && item.channelSyncError && (
                            <span>실패 사유: {item.channelSyncError}</span>
                          )}
                          {item.channelSyncStatus === 'pending' && (
                            <span>채널로 전송 중입니다...</span>
                          )}
                          {item.channelSyncStatus === 'not_sent' && (
                            <span>채널에 전송되지 않음</span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {item.channelSyncStatus === 'failed' && (
                      <ResendTrackingButton
                        historyId={item.id}
                        onResend={onResend}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {filteredHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <p className="text-lg font-medium">처리 이력이 없습니다</p>
            <p className="text-sm mt-1">필터 조건을 변경해보세요</p>
          </div>
        )}
      </div>

      {/* Pagination info */}
      <div className="flex items-center justify-end px-4 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
        1-{filteredHistory.length} / {history.length}건
      </div>
    </div>
  )
}
