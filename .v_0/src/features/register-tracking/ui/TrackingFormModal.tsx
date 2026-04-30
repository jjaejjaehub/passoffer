'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, addDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CARRIERS, type Order } from '@/src/entities/order'
import { trackingSchema, type TrackingFormData } from '../model/schema'
import { toast } from 'sonner'
import { Check, CalendarIcon, Truck, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrackingFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onSubmit: (
    orderIds: string[],
    data: TrackingFormData
  ) => Promise<{ success: boolean; channelSyncFailed?: boolean }>
}

function formatTrackingNumber(value: string): string {
  const digits = value.replace(/[^\d]/g, '')
  const parts = digits.match(/.{1,4}/g) || []
  return parts.join('-')
}

export function TrackingFormModal({
  open,
  onOpenChange,
  orders,
  onSubmit,
}: TrackingFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'shipDate' | 'tracking'>('shipDate')
  const isBulkMode = orders.length > 1

  const form = useForm<TrackingFormData>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      expectedShipDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      carrierId: undefined,
      trackingNumber: '',
      sendToChannel: true,
      memo: '',
    },
  })

  const trackingNumber = form.watch('trackingNumber') || ''
  const memo = form.watch('memo') || ''
  const expectedShipDate = form.watch('expectedShipDate')
  const isValidTrackingNumber = trackingNumber.replace(/\D/g, '').length >= 10

  const handleSubmit = async (data: TrackingFormData) => {
    // Validate based on active tab
    if (activeTab === 'tracking') {
      if (!data.carrierId) {
        form.setError('carrierId', { message: '택배사를 선택해 주세요' })
        return
      }
      if (!data.trackingNumber || data.trackingNumber.replace(/\D/g, '').length < 10) {
        form.setError('trackingNumber', { message: '송장번호를 입력해 주세요 (10자리 이상)' })
        return
      }
    }

    setIsSubmitting(true)
    try {
      const result = await onSubmit(
        orders.map((o) => o.id),
        data
      )
      if (result.success) {
        if (activeTab === 'shipDate') {
          toast.success(`발송 예정일이 ${data.expectedShipDate}로 설정되었습니다`)
        } else if (result.channelSyncFailed) {
          toast.warning(
            '송장은 등록됐으나 Qoo10 전송에 실패했습니다. 재전송이 필요합니다.',
            { duration: 6000 }
          )
        } else {
          toast.success('송장이 등록됐고 Qoo10에 전송됐습니다')
        }
        onOpenChange(false)
        form.reset()
      }
    } catch {
      toast.error('처리에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTrackingNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const formatted = formatTrackingNumber(e.target.value)
    form.setValue('trackingNumber', formatted, { shouldValidate: true })
  }

  const quickDateOptions = [
    { label: '내일', days: 1 },
    { label: '모레', days: 2 },
    { label: '3일 후', days: 3 },
    { label: '일주일 후', days: 7 },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isBulkMode
              ? `${orders.length}건 주문 배송 처리`
              : `배송 처리 · ${orders[0]?.id || ''}`}
          </DialogTitle>
          <DialogDescription>
            발송 예정일 또는 운송장 번호를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'shipDate' | 'tracking')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="shipDate" className="flex items-center gap-2">
              <Clock className="size-4" />
              발송 예정일
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Truck className="size-4" />
              운송장 입력
            </TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4 mt-4"
            >
              {/* Order Summary */}
              {isBulkMode ? (
                <ScrollArea className="h-[100px] rounded-md border bg-slate-50 p-3">
                  <div className="space-y-2">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-mono text-slate-600">
                          {order.id}
                        </span>
                        <span className="text-slate-500 truncate max-w-[200px]">
                          {order.items[0]?.productName}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                orders[0] && (
                  <div className="rounded-md border bg-slate-50 p-3 space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      {orders[0].items[0]?.productName}
                      {orders[0].items.length > 1 &&
                        ` 외 ${orders[0].items.length - 1}건`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {orders[0].buyer.name} · {orders[0].shipping.address1}
                    </p>
                  </div>
                )
              )}

              {/* Tab: Expected Ship Date */}
              <TabsContent value="shipDate" className="mt-0 space-y-4">
                <FormField
                  control={form.control}
                  name="expectedShipDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        발송 예정일 <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {quickDateOptions.map((option) => {
                          const dateValue = format(addDays(new Date(), option.days), 'yyyy-MM-dd')
                          const isSelected = field.value === dateValue
                          return (
                            <Button
                              key={option.days}
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => form.setValue('expectedShipDate', dateValue)}
                              className={cn(
                                isSelected && 'bg-indigo-600 hover:bg-indigo-700'
                              )}
                            >
                              {option.label}
                            </Button>
                          )
                        })}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value
                                ? format(new Date(field.value), 'PPP', { locale: ko })
                                : '날짜를 선택하세요'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) =>
                              form.setValue(
                                'expectedShipDate',
                                date ? format(date, 'yyyy-MM-dd') : ''
                              )
                            }
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        고객에게 안내되는 예상 발송일입니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab: Tracking Number */}
              <TabsContent value="tracking" className="mt-0 space-y-4">
                {/* Carrier Select */}
                <FormField
                  control={form.control}
                  name="carrierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        택배사 <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="택배사를 선택해 주세요" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CARRIERS.map((carrier) => (
                            <SelectItem key={carrier.id} value={carrier.id}>
                              {carrier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tracking Number */}
                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        송장번호 <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="예: 1234-5678-9012"
                            {...field}
                            onChange={handleTrackingNumberChange}
                            className={cn(
                              'pr-10',
                              isValidTrackingNumber && 'border-green-500'
                            )}
                          />
                          {isValidTrackingNumber && (
                            <Check className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-green-500" />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        숫자와 하이픈(-)만 입력하세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Send to Channel */}
                <FormField
                  control={form.control}
                  name="sendToChannel"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">
                          Qoo10 자동 전송
                        </FormLabel>
                        <FormDescription className="text-xs">
                          저장 시 Qoo10에 즉시 전송됩니다
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Memo (shared) */}
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="배송 관련 메모 (선택)"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-end">
                      <span className="text-xs text-slate-400">
                        {memo.length}/200
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      저장 중...
                    </>
                  ) : activeTab === 'shipDate' ? (
                    '예정일 저장'
                  ) : (
                    '송장 등록'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
