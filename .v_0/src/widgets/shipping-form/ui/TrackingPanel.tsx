'use client'

import { AnimatePresence } from 'framer-motion'
import type { Order } from '@/src/entities/order'
import { SingleTrackingForm } from './SingleTrackingForm'
import { BulkTrackingForm } from './BulkTrackingForm'

interface TrackingFormData {
  carrierId: 'cj' | 'lotte' | 'hanjin' | 'epost' | 'etc'
  trackingNumber: string
  sendToChannel: boolean
  memo?: string
}

interface TrackingPanelProps {
  selectedOrders: Order[]
  onClose: () => void
  onSubmitSingle: (orderId: string, data: TrackingFormData) => Promise<void>
  onSubmitBulk: (orderIds: string[], data: TrackingFormData) => Promise<void>
  onSwitchToExcel: () => void
  excelUploadZone: React.ReactNode
}

export function TrackingPanel({
  selectedOrders,
  onClose,
  onSubmitSingle,
  onSubmitBulk,
  onSwitchToExcel,
  excelUploadZone,
}: TrackingPanelProps) {
  const mode = selectedOrders.length === 0 ? 'excel' : selectedOrders.length === 1 ? 'single' : 'bulk'

  return (
    <div className="h-full bg-white border-l border-slate-200 flex flex-col">
      <AnimatePresence mode="wait">
        {mode === 'excel' && (
          <div key="excel" className="flex-1 overflow-auto">
            {excelUploadZone}
          </div>
        )}
        {mode === 'single' && (
          <SingleTrackingForm
            key="single"
            order={selectedOrders[0]}
            onClose={onClose}
            onSubmit={onSubmitSingle}
          />
        )}
        {mode === 'bulk' && (
          <BulkTrackingForm
            key="bulk"
            orders={selectedOrders}
            onClose={onClose}
            onSubmit={onSubmitBulk}
            onSwitchToExcel={onSwitchToExcel}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
