'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { LIVE_CHANNELS } from '@/constants/channels'
import type { DateRange } from '@/src/entities/order'
import { Search, Filter, Download, X } from 'lucide-react'
import { toast } from 'sonner'

interface OrderFilterBarProps {
  channelId: string
  status: string
  dateRange: string
  search: string
  channelCounts: Record<string, number>
  statusCounts: Record<string, number>
  onChannelChange: (id: string) => void
  onStatusChange: (s: string) => void
  onDateChange: (d: string) => void
  onSearchChange: (s: string) => void
  onOpenFilterDrawer: () => void
  activeFilterCount: number
  className?: string
}

const STATUS_TABS = [
  '전체',
  '신규',
  '처리중',
  '배송준비',
  '배송중',
  '완료',
  '취소·반품',
]

const DATE_RANGES: DateRange[] = ['오늘', '7일', '30일', '직접입력']

export function OrderFilterBar({
  channelId,
  status,
  dateRange,
  search,
  channelCounts,
  statusCounts,
  onChannelChange,
  onStatusChange,
  onDateChange,
  onSearchChange,
  onOpenFilterDrawer,
  activeFilterCount,
  className,
}: OrderFilterBarProps) {
  const [searchValue, setSearchValue] = useState(search)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')

  // Channel tabs: 전체 + LIVE_CHANNELS
  const channelTabs = [
    { id: 'all', name: '전체' },
    ...LIVE_CHANNELS.map((ch) => ({ id: ch.id, name: ch.name })),
  ]

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== search) {
        onSearchChange(searchValue)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchValue, search, onSearchChange])

  const handleDateRangeChange = (range: DateRange) => {
    if (range === '직접입력') {
      setDatePopoverOpen(true)
    } else {
      onDateChange(range)
    }
  }

  const handleExcelDownload = async () => {
    toast.info('다운로드 준비 중...')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    toast.success('다운로드가 시작됐습니다')
  }

  const handleClearSearch = () => {
    setSearchValue('')
    onSearchChange('')
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-10 bg-white border-b border-neutral-200',
        className
      )}
    >
      {/* Row 1: Channel Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-neutral-100">
        {channelTabs.map((ch) => {
          const isSelected = channelId === ch.id
          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onChannelChange(ch.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm transition-all whitespace-nowrap',
                isSelected
                  ? 'font-medium text-neutral-900 border-b-2 border-neutral-900'
                  : 'font-normal text-neutral-500 border-b-2 border-transparent hover:text-neutral-700'
              )}
            >
              {ch.name}
              <Badge
                className={cn(
                  'h-5 min-w-5 px-1.5 text-xs',
                  isSelected
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-500'
                )}
              >
                {channelCounts[ch.id] ?? 0}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Row 2: Status Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-neutral-100">
        {STATUS_TABS.map((s) => {
          const isSelected = status === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusChange(s)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-sm transition-all whitespace-nowrap rounded',
                isSelected
                  ? 'font-medium text-neutral-900 bg-neutral-100'
                  : 'font-normal text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
              )}
            >
              {s}
              <span
                className={cn(
                  'text-xs',
                  isSelected ? 'text-neutral-700' : 'text-neutral-400'
                )}
              >
                ({statusCounts[s] ?? 0})
              </span>
            </button>
          )
        })}
      </div>

      {/* Row 3: Date Range + Search + Actions */}
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        {/* Left: Date Range Buttons */}
        <div className="flex items-center">
          {DATE_RANGES.map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-8 px-3 rounded-none first:rounded-l-md last:rounded-r-md border-r-0 last:border-r',
                dateRange === range
                  ? 'bg-neutral-900 hover:bg-neutral-700 text-white border-neutral-900'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              )}
              onClick={() => handleDateRangeChange(range)}
            >
              {range}
            </Button>
          ))}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <span className="sr-only">날짜 선택</span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4" align="start">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="YYYY.MM.DD"
                  className="w-32 h-8 text-sm"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                />
                <span className="text-neutral-400">~</span>
                <Input
                  type="text"
                  placeholder="YYYY.MM.DD"
                  className="w-32 h-8 text-sm"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-8 bg-neutral-900 hover:bg-neutral-700"
                  onClick={() => setDatePopoverOpen(false)}
                >
                  적용
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Right: Search + Filter + Excel */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              type="text"
              placeholder="주문번호, 상품명, 구매자명으로 검색"
              className="h-9 pl-9 pr-9 text-sm border-neutral-200"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {searchValue && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-neutral-200 text-neutral-700"
            onClick={onOpenFilterDrawer}
          >
            <Filter className="size-4" />
            상세 필터
            {activeFilterCount > 0 && (
              <Badge className="ml-1 h-5 min-w-5 px-1.5 bg-neutral-900 text-white">
                {activeFilterCount}
              </Badge>
            )}
          </Button>

          {/* Excel Download Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 border-neutral-200 text-neutral-700"
            onClick={handleExcelDownload}
          >
            <Download className="size-4" />
            엑셀 다운로드
          </Button>
        </div>
      </div>
    </div>
  )
}
