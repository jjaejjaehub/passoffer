import type { Order } from '@/src/entities/order'

export type CarrierId = 'cj' | 'lotte' | 'hanjin' | 'epost' | 'yamato' | 'sagawa' | 'japanpost' | 'seino' | 'etc'

export type DeliveryStep = 'pickup' | 'transit' | 'arrived' | 'out' | 'delivered'

export type ChannelSyncStatus = 'success' | 'failed' | 'pending' | 'not_sent'

export interface CarrierConfig {
  name: string
  color: string
  trackingUrl: string
}

export interface DeliveryStepConfig {
  key: DeliveryStep
  label: string
}

export interface DeliveryEvent {
  id: string
  timestamp: Date
  location: string
  status: string
  step: DeliveryStep
}

export interface TrackingInfo {
  orderId: string
  channelOrderId: string
  carrierId: CarrierId
  carrierName: string
  trackingNumber: string
  currentStep: DeliveryStep
  events: DeliveryEvent[]
  registeredAt: Date
  channelSyncStatus: ChannelSyncStatus
  channelSyncAt?: Date
  channelSyncError?: string
}

export interface ShippingHistory {
  id: string
  orderId: string
  channelOrderId: string
  channelId: Order['channelId']
  carrierId: CarrierId
  trackingNumber: string
  processedAt: Date
  processedBy: string
  channelSyncStatus: ChannelSyncStatus
  channelSyncAt?: Date
  channelSyncError?: string
}

export interface PendingShipment {
  order: Order
  selected: boolean
}

export interface TrackingFormData {
  carrierId: CarrierId
  trackingNumber: string
  sendToChannel: boolean
  memo?: string
}

export interface BulkUploadRow {
  rowNumber: number
  orderId: string
  carrierId: CarrierId
  trackingNumber: string
  validationStatus: 'valid' | 'warning' | 'error'
  validationMessage?: string
}

export type UploadState = 'idle' | 'dragover' | 'uploading' | 'preview' | 'submitting' | 'done'
