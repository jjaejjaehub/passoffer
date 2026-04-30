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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const bulkTrackingSchema = z.object({
  carrierId: z.enum(['cj', 'lotte', 'hanjin', 'epost', 'etc'] as const),
  trackingNumber: z.string().min(1, '송장번호를 입력해주세요'),
  sendToChannel: z.boolean(),
})

type BulkTrackingFormValues = z.infer<typeof bulkTrackingSchema>

interface BulkTrackingFormProps {
  orders: Order[]
  onClose: () => void
  onSubmit: (orderIds: string[], data: BulkTrackingFormValues) => Promise<void>
  onSwitchToExcel: () => void
}

export function BulkTrackingForm({
  orders,
  onClose,
  onSubmit,
  onSwitchToExcel,
}: BulkTrackingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<BulkTrackingFormValues>({
    resolver: zodResolver(bulkTrackingSchema),
    defaultValues: {
      carrierId: 'cj',
      trackingNumber: '',
      sendToChannel: true,
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

  const handleSubmit = async (data: BulkTrackingFormValues) => {
    if (!isValidTrackingNumber) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(orders.map((o) => o.id), data)
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
        <span className="text-sm font-semibold text-slate-900">{orders.length}건 일괄 처리</span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 text-slate-500"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Selected orders summary */}
      <div className="mx-4 mt-4 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-500 mb-2">선택된 주문</p>
        <ul className="space-y-1">
          {orders.map((order) => (
            <li key={order.id} className="text-sm text-slate-700 flex items-center gap-1">
              <span className="text-slate-400">·</span>
              <span className="font-mono text-xs">{order.channelOrderId.slice(-8)}</span>
              <span className="text-slate-500 truncate">{order.items[0].productName}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Warning notice */}
      <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          모든 선택 주문에 동일한 택배사와 송장번호가 적용됩니다.
        </p>
        <button
          type="button"
          onClick={onSwitchToExcel}
          className="text-sm text-indigo-600 hover:text-indigo-700 underline mt-1"
        >
          개별 입력이 필요하면 엑셀 업로드를 사용하세요
        </button>
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
              `${orders.length}건 일괄 등록`
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  )
}
