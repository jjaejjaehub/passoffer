'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DeliveryStep, TrackingInfo, DeliveryEvent } from '@/src/entities/delivery'
import { CARRIER_CONFIG, DELIVERY_STEPS } from '@/src/entities/delivery'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Mock tracking data
const MOCK_TRACKING: TrackingInfo = {
  orderId: 'ORD-240313-009',
  channelOrderId: 'GQ-20240313-00009',
  carrierId: 'cj',
  carrierName: 'CJ대한통운',
  trackingNumber: '1234-5678-9012',
  currentStep: 'out',
  registeredAt: new Date('2024-01-15T14:35:00'),
  channelSyncStatus: 'success',
  channelSyncAt: new Date('2024-01-15T14:36:00'),
  events: [
    {
      id: 'evt-6',
      timestamp: new Date('2024-01-16T09:10:00'),
      location: '서울 강남 배송센터',
      status: '배송 출발',
      step: 'out',
    },
    {
      id: 'evt-5',
      timestamp: new Date('2024-01-16T07:22:00'),
      location: '서울 강남 배송센터',
      status: '배송센터 도착',
      step: 'arrived',
    },
    {
      id: 'evt-4',
      timestamp: new Date('2024-01-15T23:45:00'),
      location: '수도권 남부 터미널',
      status: '간선 이동 중',
      step: 'transit',
    },
    {
      id: 'evt-3',
      timestamp: new Date('2024-01-15T20:30:00'),
      location: '인천 서구 물류센터',
      status: '간선 이동 중',
      step: 'transit',
    },
    {
      id: 'evt-2',
      timestamp: new Date('2024-01-15T17:15:00'),
      location: '인천 서구 물류센터',
      status: '집화 완료',
      step: 'pickup',
    },
    {
      id: 'evt-1',
      timestamp: new Date('2024-01-15T14:35:00'),
      location: '-',
      status: '배송 접수',
      step: 'pickup',
    },
  ],
}

interface TrackingSearchTabProps {
  className?: string
}

export function TrackingSearchTab({ className }: TrackingSearchTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([
    '1234-5678-9012 (CJ)',
    '2345-6789-0123 (롯데)',
  ])
  const [searchResult, setSearchResult] = useState<TrackingInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [copiedTrackingNumber, setCopiedTrackingNumber] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setNotFound(false)
    setSearchResult(null)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock: if query contains "1234", show result
    if (searchQuery.includes('1234')) {
      setSearchResult(MOCK_TRACKING)
      // Add to recent searches
      const newSearch = `${MOCK_TRACKING.trackingNumber} (${CARRIER_CONFIG[MOCK_TRACKING.carrierId].name.slice(0, 2)})`
      setRecentSearches((prev) =>
        [newSearch, ...prev.filter((s) => s !== newSearch)].slice(0, 5)
      )
    } else {
      setNotFound(true)
    }

    setIsSearching(false)
  }, [searchQuery])

  const handleRecentClick = (search: string) => {
    const trackingNumber = search.split(' ')[0]
    setSearchQuery(trackingNumber)
    // Trigger search
    setTimeout(() => {
      if (trackingNumber.includes('1234')) {
        setSearchResult(MOCK_TRACKING)
        setNotFound(false)
      }
    }, 100)
  }

  const handleCopyTrackingNumber = async (trackingNumber: string) => {
    await navigator.clipboard.writeText(trackingNumber.replace(/-/g, ''))
    setCopiedTrackingNumber(true)
    setTimeout(() => setCopiedTrackingNumber(false), 2000)
  }

  const getStepIndex = (step: DeliveryStep) => {
    return DELIVERY_STEPS.findIndex((s) => s.key === step)
  }

  return (
    <div className={cn('p-6', className)}>
      {/* Search area */}
      <div className="max-w-xl mx-auto">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="송장번호 또는 주문번호를 입력하세요"
              className="pl-10 h-12 text-base"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700"
          >
            {isSearching ? '조회중...' : '조회'}
          </Button>
        </div>

        {/* Recent searches */}
        {recentSearches.length > 0 && !searchResult && !notFound && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-500">최근 조회:</span>
            {recentSearches.map((search) => (
              <Badge
                key={search}
                variant="outline"
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => handleRecentClick(search)}
              >
                {search}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Search result */}
      <AnimatePresence mode="wait">
        {notFound && (
          <motion.div
            key="not-found"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl mx-auto mt-8"
          >
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertTitle className="text-amber-800">송장 정보를 찾을 수 없습니다</AlertTitle>
              <AlertDescription className="text-amber-700">
                번호를 다시 확인하거나 잠시 후 시도해 주세요
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {searchResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-3xl mx-auto mt-8"
          >
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-slate-600">
                      {searchResult.channelOrderId}
                    </span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      배송중
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Carrier info */}
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      className={cn(
                        'px-3 py-1',
                        searchResult.carrierId === 'cj' && 'bg-blue-100 text-blue-700',
                        searchResult.carrierId === 'lotte' && 'bg-red-100 text-red-700',
                        searchResult.carrierId === 'hanjin' && 'bg-yellow-100 text-yellow-800',
                        searchResult.carrierId === 'epost' && 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {searchResult.carrierName}
                    </Badge>
                    <span className="font-mono text-lg text-slate-900">
                      {searchResult.trackingNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyTrackingNumber(searchResult.trackingNumber)}
                      className="p-1.5 hover:bg-slate-100 rounded"
                    >
                      {copiedTrackingNumber ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                  <a
                    href={`${CARRIER_CONFIG[searchResult.carrierId].trackingUrl}${searchResult.trackingNumber.replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    택배사 사이트에서 확인
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>

              {/* Delivery stepper */}
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  {DELIVERY_STEPS.map((step, index) => {
                    const currentIndex = getStepIndex(searchResult.currentStep)
                    const isCompleted = index < currentIndex
                    const isCurrent = index === currentIndex
                    const carrierColor = CARRIER_CONFIG[searchResult.carrierId].color

                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className="flex items-center w-full">
                          {/* Line before */}
                          {index > 0 && (
                            <div
                              className={cn(
                                'flex-1 h-0.5',
                                isCompleted || isCurrent ? 'bg-indigo-500' : 'bg-slate-200'
                              )}
                            />
                          )}

                          {/* Circle */}
                          <div
                            className={cn(
                              'size-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0',
                              isCompleted && 'bg-indigo-500 text-white',
                              isCurrent && carrierColor === 'blue' && 'bg-blue-500 text-white ring-4 ring-blue-100',
                              isCurrent && carrierColor === 'red' && 'bg-red-500 text-white ring-4 ring-red-100',
                              isCurrent && carrierColor === 'yellow' && 'bg-yellow-500 text-white ring-4 ring-yellow-100',
                              isCurrent && carrierColor === 'orange' && 'bg-orange-500 text-white ring-4 ring-orange-100',
                              !isCompleted && !isCurrent && 'bg-slate-200 text-slate-400'
                            )}
                          >
                            {isCompleted ? (
                              <Check className="size-4" />
                            ) : (
                              index + 1
                            )}
                          </div>

                          {/* Line after */}
                          {index < DELIVERY_STEPS.length - 1 && (
                            <div
                              className={cn(
                                'flex-1 h-0.5',
                                isCompleted ? 'bg-indigo-500' : 'bg-slate-200'
                              )}
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            'mt-2 text-xs text-center',
                            isCurrent ? 'font-medium text-slate-900' : 'text-slate-500'
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Event log */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-slate-700 mb-3">배송 이벤트</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">일시</TableHead>
                      <TableHead>위치</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResult.events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm text-slate-600">
                          {format(event.timestamp, 'MM.dd a h:mm', { locale: ko })}
                        </TableCell>
                        <TableCell className="text-sm text-slate-700">
                          {event.location}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-slate-900">
                          {event.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
