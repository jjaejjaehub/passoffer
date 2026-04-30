'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'
import {
  Lock,
  Check,
  X,
  Copy,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChannelId } from '@/types/channel'
import type { CarrierId, ChannelSyncStatus } from '@/src/entities/delivery/model/types'
import {
  CARRIER_CONFIG,
  CHANNEL_CARRIERS,
  formatTrackingNumber,
  validateTrackingNumber,
  getTrackingPlaceholder,
} from '@/src/entities/delivery/model/constants'
import { CHANNEL_NAMES } from '@/constants/channels'

type CellMode = 'locked' | 'editing' | 'saving' | 'saved' | 'sync_failed'

interface TrackingInputCellProps {
  orderId: string
  channelId: ChannelId
  shipDate: string | null
  existingCarrierId?: CarrierId
  existingTrackingNumber?: string
  channelSyncStatus?: ChannelSyncStatus
  onSave: (data: { carrierId: CarrierId; trackingNumber: string }) => Promise<{ success: boolean; channelSyncFailed?: boolean }>
  onCancel: () => void
  forceEdit?: boolean
}

export function TrackingInputCell({
  orderId,
  channelId,
  shipDate,
  existingCarrierId,
  existingTrackingNumber,
  channelSyncStatus,
  onSave,
  onCancel,
  forceEdit = false,
}: TrackingInputCellProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<CellMode>(() => {
    if (existingTrackingNumber) {
      return channelSyncStatus === 'failed' ? 'sync_failed' : 'saved'
    }
    if (!shipDate && !forceEdit) return 'locked'
    return 'editing'
  })
  const [carrierId, setCarrierId] = useState<CarrierId | ''>(existingCarrierId || '')
  const [trackingNumber, setTrackingNumber] = useState(existingTrackingNumber || '')
  const [copied, setCopied] = useState(false)
  const [resendDialogOpen, setResendDialogOpen] = useState(false)

  const allowedCarriers = CHANNEL_CARRIERS[channelId] || []
  const isValid = carrierId && validateTrackingNumber(trackingNumber, carrierId as CarrierId)
  const channelName = CHANNEL_NAMES[channelId]
  const channelSystemName = channelId === 'rakuten' ? '라쿠텐 RMS' : channelId === 'qoo10' ? 'Qoo10' : channelName

  // Update mode when shipDate changes
  useEffect(() => {
    if (mode === 'locked' && shipDate) {
      setMode('editing')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [shipDate, mode])

  // Force edit mode
  useEffect(() => {
    if (forceEdit && (mode === 'saved' || mode === 'sync_failed')) {
      setMode('editing')
    }
  }, [forceEdit, mode])

  const handleCarrierChange = useCallback((value: string) => {
    setCarrierId(value as CarrierId)
    setTrackingNumber('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleTrackingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!carrierId) return
      const formatted = formatTrackingNumber(e.target.value, carrierId as CarrierId)
      setTrackingNumber(formatted)
    },
    [carrierId]
  )

  const handleSave = useCallback(async () => {
    if (!carrierId || !isValid) return

    setMode('saving')
    try {
      const result = await onSave({
        carrierId: carrierId as CarrierId,
        trackingNumber,
      })
      if (result.success) {
        setMode(result.channelSyncFailed ? 'sync_failed' : 'saved')
      } else {
        setMode('editing')
      }
    } catch {
      setMode('editing')
    }
  }, [carrierId, trackingNumber, isValid, onSave])

  const handleCancel = useCallback(() => {
    setCarrierId(existingCarrierId || '')
    setTrackingNumber(existingTrackingNumber || '')
    if (existingTrackingNumber) {
      setMode(channelSyncStatus === 'failed' ? 'sync_failed' : 'saved')
    } else {
      setMode(shipDate ? 'editing' : 'locked')
    }
    onCancel()
  }, [existingCarrierId, existingTrackingNumber, channelSyncStatus, shipDate, onCancel])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isValid) {
        handleSave()
      } else if (e.key === 'Escape') {
        handleCancel()
      }
    },
    [isValid, handleSave, handleCancel]
  )

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(trackingNumber.replace(/-/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [trackingNumber])

  const handleResend = useCallback(async () => {
    setResendDialogOpen(false)
    setMode('saving')
    try {
      const result = await onSave({
        carrierId: carrierId as CarrierId,
        trackingNumber,
      })
      setMode(result.channelSyncFailed ? 'sync_failed' : 'saved')
    } catch {
      setMode('sync_failed')
    }
  }, [carrierId, trackingNumber, onSave])

  const carrierConfig = carrierId ? CARRIER_CONFIG[carrierId as CarrierId] : null

  // Locked mode
  if (mode === 'locked') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-slate-300">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">발송 예정일 먼저</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>발송 예정일을 먼저 입력하세요</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Saving mode
  if (mode === 'saving') {
    return (
      <div className="flex items-center gap-2">
        <Spinner className="h-4 w-4" />
        <span className="text-xs text-slate-500">저장 중...</span>
      </div>
    )
  }

  // Saved / Sync Failed mode
  if (mode === 'saved' || mode === 'sync_failed') {
    const isJapanese = carrierConfig?.region === 'jp'

    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn(
              'h-5 px-1.5 text-[10px] font-medium',
              carrierConfig?.color === 'blue' && 'bg-blue-50 text-blue-700',
              carrierConfig?.color === 'red' && 'bg-red-50 text-red-700',
              carrierConfig?.color === 'yellow' && 'bg-yellow-50 text-yellow-700',
              carrierConfig?.color === 'orange' && 'bg-orange-50 text-orange-700',
              carrierConfig?.color === 'green' && 'bg-green-50 text-green-700',
              carrierConfig?.color === 'purple' && 'bg-purple-50 text-purple-700',
              carrierConfig?.color === 'gray' && 'bg-slate-100 text-slate-600'
            )}
          >
            {carrierConfig?.shortName}
          </Badge>
          <span className="font-mono text-xs text-slate-700">{trackingNumber}</span>

          {/* Copy button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={handleCopy}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Check className="h-3 w-3 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Copy className="h-3 w-3 text-slate-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            <TooltipContent>복사</TooltipContent>
          </Tooltip>

          {/* External link for Japanese carriers */}
          {isJapanese && carrierConfig?.trackingUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => window.open(`${carrierConfig.trackingUrl}${trackingNumber.replace(/-/g, '')}`, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{carrierConfig.shortName} 사이트에서 추적하기 (일본어)</TooltipContent>
            </Tooltip>
          )}

          {/* Sync status icon */}
          {mode === 'saved' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>{channelSystemName} 전송 완료</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="flex items-center"
                  onClick={() => setResendDialogOpen(true)}
                >
                  <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="space-y-1">
                <p>{channelSystemName} 전송 실패</p>
                <button
                  className="text-xs text-orange-500 hover:underline"
                  onClick={() => setResendDialogOpen(true)}
                >
                  재전송
                </button>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Resend dialog */}
          <AlertDialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>운송장 정보 재전송</AlertDialogTitle>
                <AlertDialogDescription>
                  이 운송장 정보를 {channelSystemName}에 다시 전송하시겠습니까?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleResend}
                >
                  전송하기
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    )
  }

  // Editing mode
  return (
    <div className="flex items-center gap-1">
      <Select value={carrierId} onValueChange={handleCarrierChange}>
        <SelectTrigger className="h-7 w-[90px] text-xs">
          <SelectValue placeholder="택배사" />
        </SelectTrigger>
        <SelectContent>
          {allowedCarriers.map((cid) => (
            <SelectItem key={cid} value={cid} className="text-xs">
              {CARRIER_CONFIG[cid].shortName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Input
          ref={inputRef}
          id={`tracking-input-${orderId}`}
          value={trackingNumber}
          onChange={handleTrackingChange}
          onKeyDown={handleKeyDown}
          placeholder={carrierId ? getTrackingPlaceholder(carrierId as CarrierId) : '택배사 선택'}
          disabled={!carrierId}
          className={cn(
            'h-7 text-xs font-mono pr-6',
            isValid && 'pr-8'
          )}
        />
        {isValid && (
          <Check className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-500" />
        )}
      </div>

      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
          onClick={handleSave}
          disabled={!isValid}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
          onClick={handleCancel}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
