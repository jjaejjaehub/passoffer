'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChannelBadge } from '@/components/oms/channel-badge'
import { ShipDateCell } from '@/src/shared/ui/ShipDateCell'
import { DEFAULT_CHANNELS } from '@/constants/channels'
import type { Order } from '@/src/entities/order'
import type { ChannelId } from '@/types/channel'
import type { CarrierId } from '@/src/entities/delivery/model/types'
import {
  CARRIER_CONFIG,
  CHANNEL_CARRIERS,
  KR_CARRIERS,
  JP_CARRIERS,
  ETC_CARRIERS,
  formatTrackingNumber,
  validateTrackingNumber,
  getTrackingPlaceholder,
} from '@/src/entities/delivery/model/constants'
import { useBulkRegisterTracking } from '../model/useRegisterTracking'
import { CheckCircle, Info, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays } from 'date-fns'

interface BulkTrackingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: Order[]
  onComplete: (results: { orderId: string; success: boolean; channelSent: boolean }[]) => void
}

const bulkSchema = z.object({
  shipDate: z.string().min(1, '발송 예정일을 선택해 주세요'),
  carrierId: z.enum(['cj', 'lotte', 'hanjin', 'epost', 'yamato', 'sagawa', 'japanpost', 'seino', 'etc'] as const, {
    required_error: '택배사를 선택해 주세요',
  }),
  trackingNumber: z.string().min(1, '송장번호를 입력해 주세요'),
})

type BulkFormData = z.infer<typeof bulkSchema>

interface IndividualRow {
  orderId: string
  channelId: ChannelId
  productName: string
  shipDate: string
  carrierId: CarrierId | ''
  trackingNumber: string
  isComplete: boolean
}

type ModalState = 'form' | 'complete'

export function BulkTrackingModal({
  open,
  onOpenChange,
  orders,
  onComplete,
}: BulkTrackingModalProps) {
  const [activeTab, setActiveTab] = useState<'bulk' | 'individual'>('bulk')
  const [modalState, setModalState] = useState<ModalState>('form')
  const [results, setResults] = useState<{ orderId: string; success: boolean; channelSent: boolean }[]>([])
  const [skipIncomplete, setSkipIncomplete] = useState(false)

  const { registerBulk, isLoading } = useBulkRegisterTracking()

  // Individual rows state
  const [individualRows, setIndividualRows] = useState<IndividualRow[]>(() =>
    orders.map((order) => ({
      orderId: order.id,
      channelId: order.channelId,
      productName: order.items[0]?.productName || '',
      shipDate: '',
      carrierId: '',
      trackingNumber: '',
      isComplete: false,
    }))
  )

  // Bulk form
  const bulkForm = useForm<BulkFormData>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      shipDate: format(addDays(new Date(), 1), 'yyyy.MM.dd'),
      carrierId: undefined,
      trackingNumber: '',
    },
  })

  // Check for mixed channels
  const uniqueChannels = useMemo(() => {
    const channels = new Set(orders.map((o) => o.channelId))
    return Array.from(channels)
  }, [orders])
  const isMixedChannels = uniqueChannels.length > 1

  // Get available carriers for bulk mode
  const availableCarriers = useMemo(() => {
    if (isMixedChannels) {
      // Show all carriers grouped
      return { kr: KR_CARRIERS, jp: JP_CARRIERS, etc: ETC_CARRIERS, isMixed: true }
    }
    const channelId = orders[0]?.channelId
    const allowed = channelId ? CHANNEL_CARRIERS[channelId] : []
    const carriers = allowed.map((id) => ({
      id,
      name: CARRIER_CONFIG[id].name,
      shortName: CARRIER_CONFIG[id].shortName,
      color: CARRIER_CONFIG[id].color,
      region: CARRIER_CONFIG[id].region,
    }))
    return { all: carriers, isMixed: false }
  }, [orders, isMixedChannels])

  // Complete count for individual mode
  const completeCount = individualRows.filter((r) => r.isComplete).length
  const totalCount = individualRows.length
  const progressPercent = totalCount > 0 ? (completeCount / totalCount) * 100 : 0

  // Update individual row
  const updateIndividualRow = useCallback(
    (orderId: string, field: keyof IndividualRow, value: string) => {
      setIndividualRows((prev) =>
        prev.map((row) => {
          if (row.orderId !== orderId) return row
          const updated = { ...row, [field]: value }

          // Check if complete
          const isComplete =
            updated.shipDate.length === 10 &&
            updated.carrierId !== '' &&
            validateTrackingNumber(updated.trackingNumber, updated.carrierId as CarrierId)
          updated.isComplete = isComplete

          return updated
        })
      )
    },
    []
  )

  // Handle bulk submit
  const handleBulkSubmit = useCallback(
    async (data: BulkFormData) => {
      const items = orders.map((order) => ({
        orderId: order.id,
        channelId: order.channelId,
        carrierId: data.carrierId,
        trackingNumber: data.trackingNumber,
        shipDate: data.shipDate,
        sendToChannel: true,
      }))

      const result = await registerBulk({ items })
      setResults(result.results)
      setModalState('complete')
    },
    [orders, registerBulk]
  )

  // Handle individual submit
  const handleIndividualSubmit = useCallback(async () => {
    const rowsToSubmit = skipIncomplete
      ? individualRows.filter((r) => r.isComplete)
      : individualRows.filter((r) => r.isComplete)

    if (rowsToSubmit.length === 0) return

    const items = rowsToSubmit.map((row) => ({
      orderId: row.orderId,
      channelId: row.channelId,
      carrierId: row.carrierId as CarrierId,
      trackingNumber: row.trackingNumber,
      shipDate: row.shipDate,
      sendToChannel: true,
    }))

    const result = await registerBulk({ items })
    setResults(result.results)
    setModalState('complete')
  }, [individualRows, skipIncomplete, registerBulk])

  // Handle close
  const handleClose = useCallback(() => {
    if (modalState === 'complete') {
      onComplete(results)
    }
    onOpenChange(false)
    // Reset state after close
    setTimeout(() => {
      setModalState('form')
      setResults([])
      bulkForm.reset()
      setIndividualRows(
        orders.map((order) => ({
          orderId: order.id,
          channelId: order.channelId,
          productName: order.items[0]?.productName || '',
          shipDate: '',
          carrierId: '',
          trackingNumber: '',
          isComplete: false,
        }))
      )
    }, 300)
  }, [modalState, results, onComplete, onOpenChange, orders, bulkForm])

  const getChannelById = (channelId: ChannelId) => {
    return DEFAULT_CHANNELS.find((c) => c.id === channelId) || DEFAULT_CHANNELS[0]
  }

  const failedSyncCount = results.filter((r) => r.success && !r.channelSent).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{orders.length}건 일괄 배송 처리</DialogTitle>
          <DialogDescription>
            선택한 주문에 배송 정보를 일괄 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {modalState === 'form' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <Tabs
                value={activeTab}
                onValueChange={(v: string) => setActiveTab(v as 'bulk' | 'individual')}
                className="flex-1 flex flex-col"
              >
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="bulk">일괄 입력</TabsTrigger>
                  <TabsTrigger value="individual">개별 입력</TabsTrigger>
                </TabsList>

                {/* Bulk Input Tab */}
                <TabsContent value="bulk" className="flex-1 overflow-auto space-y-4 mt-4">
                  {/* Order Summary */}
                  <ScrollArea className="h-[100px] rounded-md border bg-slate-50 p-3">
                    <div className="space-y-1">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span className="text-slate-400">·</span>
                          <ChannelBadge
                            channel={getChannelById(order.channelId)}
                            variant="icon-only"
                          />
                          <span className="font-mono text-xs">{order.id}</span>
                          <span className="text-slate-500 truncate flex-1">
                            {order.items[0]?.productName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Info Alert */}
                  <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-xs text-blue-700">
                      아래 택배사와 운송장 번호가 선택한 모든 주문에 동일하게 적용됩니다.
                    </AlertDescription>
                  </Alert>

                  {/* Mixed Channel Warning */}
                  {isMixedChannels && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-700">
                        선택한 주문에 여러 채널이 포함되어 있습니다. 채널마다 허용된 택배사가 다를 수 있으니 확인해 주세요.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Channel Carriers Summary (for mixed) */}
                  {isMixedChannels && (
                    <div className="rounded-md bg-slate-50 p-3 space-y-2 text-xs">
                      {uniqueChannels.map((channelId) => {
                        const channel = getChannelById(channelId)
                        const carriers = CHANNEL_CARRIERS[channelId]
                          .filter((cid) => cid !== 'etc')
                          .map((cid) => CARRIER_CONFIG[cid].name)
                          .join(', ')
                        const channelLabel = channelId === 'qoo10' ? '큐텐' : channelId === 'rakuten' ? '라쿠텐' : channel.name
                        return (
                          <div key={channelId} className="flex items-center gap-2">
                            <ChannelBadge channel={channel} variant="icon-only" />
                            <span className="text-slate-500 font-medium">{channelLabel}:</span>
                            <span className="text-slate-600">{carriers}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Form */}
                  <form
                    onSubmit={bulkForm.handleSubmit(handleBulkSubmit)}
                    className="space-y-4"
                  >
                    {/* Ship Date */}
                    <div className="space-y-2">
                      <Label>발송 예정일</Label>
                      <ShipDateCell
                        orderId="bulk"
                        value={bulkForm.watch('shipDate')}
                        onChange={(date) => bulkForm.setValue('shipDate', date || '')}
                      />
                      {bulkForm.formState.errors.shipDate && (
                        <p className="text-xs text-red-500">
                          {bulkForm.formState.errors.shipDate.message}
                        </p>
                      )}
                    </div>

                    {/* Carrier Select */}
                    <div className="space-y-2">
                      <Label>택배사</Label>
                      <Select
                        value={bulkForm.watch('carrierId')}
                        onValueChange={(v) => {
                          bulkForm.setValue('carrierId', v as CarrierId)
                          bulkForm.setValue('trackingNumber', '')
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="택배사 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCarriers.isMixed ? (
                            <>
                              <SelectGroup>
                                <SelectLabel>국내 택배사</SelectLabel>
                                {(availableCarriers.kr ?? []).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>일본 배송사</SelectLabel>
                                {(availableCarriers.jp ?? []).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              <SelectGroup>
                                <SelectLabel>기타</SelectLabel>
                                {(availableCarriers.etc ?? []).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </>
                          ) : (
                            availableCarriers.all?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {bulkForm.formState.errors.carrierId && (
                        <p className="text-xs text-red-500">
                          {bulkForm.formState.errors.carrierId.message}
                        </p>
                      )}
                    </div>

                    {/* Tracking Number */}
                    <div className="space-y-2">
                      <Label>운송장 번호</Label>
                      <Input
                        placeholder={
                          bulkForm.watch('carrierId')
                            ? getTrackingPlaceholder(bulkForm.watch('carrierId'))
                            : '택배사를 먼저 선택해 주세요'
                        }
                        value={bulkForm.watch('trackingNumber')}
                        onChange={(e) => {
                          const carrierId = bulkForm.watch('carrierId')
                          if (carrierId) {
                            bulkForm.setValue(
                              'trackingNumber',
                              formatTrackingNumber(e.target.value, carrierId)
                            )
                          }
                        }}
                        disabled={!bulkForm.watch('carrierId')}
                        className="font-mono"
                      />
                      {bulkForm.formState.errors.trackingNumber && (
                        <p className="text-xs text-red-500">
                          {bulkForm.formState.errors.trackingNumber.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      disabled={isLoading}
                    >
                      {isLoading ? '등록 중...' : `${orders.length}건 일괄 등록`}
                    </Button>
                  </form>
                </TabsContent>

                {/* Individual Input Tab */}
                <TabsContent value="individual" className="flex-1 overflow-hidden flex flex-col mt-4">
                  <ScrollArea className="flex-1 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead className="w-[100px]">주문번호</TableHead>
                          <TableHead className="w-[140px]">상품명</TableHead>
                          <TableHead className="w-[60px]">채널</TableHead>
                          <TableHead className="w-[110px]">발송 예정일</TableHead>
                          <TableHead className="w-[90px]">택배사</TableHead>
                          <TableHead className="w-[130px]">운송장 번호</TableHead>
                          <TableHead className="w-[40px]">상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {individualRows.map((row) => {
                          const channel = getChannelById(row.channelId)
                          const allowedCarriers = CHANNEL_CARRIERS[row.channelId]

                          return (
                            <TableRow key={row.orderId}>
                              <TableCell className="font-mono text-xs">
                                {row.orderId.slice(-8)}
                              </TableCell>
                              <TableCell className="text-xs truncate max-w-[140px]">
                                {row.productName}
                              </TableCell>
                              <TableCell>
                                <ChannelBadge channel={channel} variant="icon-only" />
                              </TableCell>
                              <TableCell>
                                <ShipDateCell
                                  orderId={row.orderId}
                                  value={row.shipDate || null}
                                  onChange={(date) =>
                                    updateIndividualRow(row.orderId, 'shipDate', date || '')
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={row.carrierId}
                                  onValueChange={(v) => {
                                    updateIndividualRow(row.orderId, 'carrierId', v)
                                    updateIndividualRow(row.orderId, 'trackingNumber', '')
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-xs w-[80px]">
                                    <SelectValue placeholder="선택" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allowedCarriers.map((cid) => (
                                      <SelectItem key={cid} value={cid} className="text-xs">
                                        {CARRIER_CONFIG[cid].shortName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={row.trackingNumber}
                                  onChange={(e) => {
                                    if (row.carrierId) {
                                      updateIndividualRow(
                                        row.orderId,
                                        'trackingNumber',
                                        formatTrackingNumber(e.target.value, row.carrierId as CarrierId)
                                      )
                                    }
                                  }}
                                  placeholder={
                                    row.carrierId
                                      ? getTrackingPlaceholder(row.carrierId as CarrierId)
                                      : '-'
                                  }
                                  disabled={!row.carrierId}
                                  className="h-7 text-xs font-mono w-[120px]"
                                />
                              </TableCell>
                              <TableCell>
                                {row.isComplete && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>

                  {/* Summary */}
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        입력 완료 {completeCount}건 / 전체 {totalCount}건
                      </span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />

                    {completeCount < totalCount && (
                      <label
                        htmlFor="skip-incomplete-checkbox"
                        className="flex items-center gap-2 text-sm text-slate-600"
                      >
                        <Checkbox
                          id="skip-incomplete-checkbox"
                          checked={skipIncomplete}
                          onCheckedChange={(checked: boolean | 'indeterminate') =>
                            setSkipIncomplete(!!checked)
                          }
                        />
                        미완료 건 건너뛰기
                      </label>
                    )}

                    <Button
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                      onClick={handleIndividualSubmit}
                      disabled={completeCount === 0 || isLoading}
                    >
                      {isLoading ? '등록 중...' : `입력 완���된 ${completeCount}건 등록`}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-8 space-y-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              >
                <CheckCircle className="h-12 w-12 text-green-500" />
              </motion.div>

              <div className="text-center space-y-1">
                <p className="text-lg font-semibold">
                  {results.filter((r) => r.success).length}건이 등록됐습니다
                </p>
                {failedSyncCount > 0 && (
                  <p className="text-sm text-orange-600">
                    이 중 {failedSyncCount}건은 채널 전송에 실패했습니다
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>
                  닫기
                </Button>
                {failedSyncCount > 0 && (
                  <Button
                    variant="outline"
                    className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    onClick={() => {
                      // Highlight failed rows - implement in parent
                      handleClose()
                    }}
                  >
                    실패 건 확인
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
