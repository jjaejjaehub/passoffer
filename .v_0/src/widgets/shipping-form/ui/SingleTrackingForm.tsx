'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { X, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Order } from '@/src/entities/order'
import type { CarrierId } from '@/src/entities/delivery'
import {
  CARRIER_CONFIG,
  CARRIER_OPTIONS,
  formatTrackingNumber,
  validateTrackingNumber,
} from '@/src/entities/delivery'
import { ChannelBadge } from '@/components/oms/channel-badge'
import { DEFAULT_CHANNELS } from '@/constants/channels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const trackingSchema = z.object({
  carrierId: z.enum(['cj', 'lotte', 'hanjin', 'epost', 'etc'] as const),
  trackingNumber: z.string().min(1, '송장번호를 입력해주세요'),
  sendToChannel: z.boolean(),
  memo: z.string().max(200).optional(),
})

type TrackingFormValues = z.infer<typeof trackingSchema>

interface SingleTrackingFormProps {
  order: Order
  onClose: () => void
  onSubmit: (orderId: string, data: TrackingFormValues) => Promise<void>
}

export function SingleTrackingForm({ order, onClose, onSubmit }: SingleTrackingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const channel = DEFAULT_CHANNELS.find((c) => c.id === order.channelId)

  const form = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      carrierId: 'cj',
      trackingNumber: '',
      sendToChannel: true,
      memo: '',
    },
  })

  const watchCarrierId = form.watch('carrierId')
  const watchTrackingNumber = form.watch('trackingNumber')
  const isValidTrackingNumber = watchTrackingNumber
    ? validateTrackingNumber(watchTrackingNumber, watchCarrierId)
    : false

  const handleTrackingNumberChange = (value: string) => {
    const formatted = formatTrackingNumber(value, watchCarrierId)
    form.setValue('trackingNumber', formatted)
  }

  const handleSubmit = async (data: TrackingFormValues) => {
    if (!isValidTrackingNumber) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(order.id, data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const carrierColor = CARRIER_CONFIG[watchCarrierId]?.color || 'gray'
  const carrierBorderClass = {
    blue: 'border-blue-400 focus-within:ring-blue-200',
    red: 'border-red-400 focus-within:ring-red-200',
    yellow: 'border-yellow-400 focus-within:ring-yellow-200',
    orange: 'border-orange-400 focus-within:ring-orange-200',
    gray: 'border-slate-300',
  }[carrierColor] || 'border-slate-300'

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <span className="text-sm font-semibold text-slate-900">1건 처리</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Order summary card */}
      <div className="mx-4 mt-4 p-3 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs text-slate-500">{order.channelOrderId}</span>
          {channel && <ChannelBadge channel={channel} variant="default" />}
        </div>
        <p className="text-sm font-medium text-slate-900 line-clamp-2">
          {order.items[0].productName}
          {order.items[0].option && (
            <span className="text-slate-500 font-normal"> ({order.items[0].option})</span>
          )}
        </p>
        {order.items.length > 1 && (
          <p className="text-xs text-slate-500 mt-0.5">외 {order.items.length - 1}건</p>
        )}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {order.buyer.name} / {order.shipping.address1.split(' ').slice(0, 2).join(' ')}
          </span>
          <span className="text-sm font-bold text-slate-900">
            {order.totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col p-4 gap-4">
        {/* Carrier Select */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            택배사 <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={form.watch('carrierId')}
            onValueChange={(value) => form.setValue('carrierId', value as CarrierId)}
          >
            <SelectTrigger className={cn('w-full', carrierBorderClass)}>
              <SelectValue placeholder="택배사 선택" />
            </SelectTrigger>
            <SelectContent>
              {CARRIER_OPTIONS.map((carrier) => (
                <SelectItem key={carrier.id} value={carrier.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        carrier.color === 'blue' && 'bg-blue-500',
                        carrier.color === 'red' && 'bg-red-500',
                        carrier.color === 'yellow' && 'bg-yellow-500',
                        carrier.color === 'orange' && 'bg-orange-500',
                        carrier.color === 'gray' && 'bg-slate-400'
                      )}
                    />
                    {carrier.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tracking Number */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            송장번호 <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Input
              {...form.register('trackingNumber')}
              placeholder="송장번호 입력"
              onChange={(e) => handleTrackingNumberChange(e.target.value)}
              className={cn(
                'pr-10',
                watchTrackingNumber && (isValidTrackingNumber ? 'border-green-400' : 'border-red-400')
              )}
            />
            {watchTrackingNumber && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidTrackingNumber ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <X className="size-4 text-red-500" />
                )}
              </span>
            )}
          </div>
          {form.formState.errors.trackingNumber && (
            <p className="text-xs text-rose-500">{form.formState.errors.trackingNumber.message}</p>
          )}
        </div>

        {/* Send to Channel Switch */}
        <div className="flex items-center justify-between py-2">
          <div>
            <Label className="text-sm font-medium">Qoo10 자동 전송</Label>
            <p className="text-xs text-slate-500 mt-0.5">등록 시 자동으로 채널에 송장 전송</p>
          </div>
          <Switch
            checked={form.watch('sendToChannel')}
            onCheckedChange={(checked) => form.setValue('sendToChannel', checked)}
          />
        </div>

        {/* Memo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">메모 (선택)</Label>
            <span className="text-xs text-slate-400">
              {(form.watch('memo') || '').length}/200
            </span>
          </div>
          <Textarea
            {...form.register('memo')}
            placeholder="배송 관련 메모"
            rows={2}
            maxLength={200}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="mt-auto pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !isValidTrackingNumber}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                등록 중...
              </>
            ) : (
              '등록하기'
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
