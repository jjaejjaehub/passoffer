import type { ChannelId, OrderStatus } from '@/types/channel'

export interface OrderItem {
  id: string
  productName: string
  option?: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface OrderAddress {
  recipient: string
  phone: string
  zipCode: string
  address1: string
  address2?: string
  deliveryMemo?: string
}

export interface OrderTracking {
  carrierId: 'cj' | 'lotte' | 'hanjin' | 'epost' | 'etc'
  carrierName: string
  trackingNumber: string
  registeredAt: Date
  sentToChannel: boolean
}

export interface OrderHistory {
  id: string
  status: OrderStatus
  timestamp: Date
  actor: string
  note?: string
}

export interface Order {
  id: string
  channelOrderId: string
  channelId: ChannelId
  status: OrderStatus
  shipDate?: string | null
  items: OrderItem[]
  totalQuantity: number
  subtotal: number
  shippingFee: number
  discount: number
  totalAmount: number
  paymentMethod: string
  buyer: {
    name: string
    phone: string
    email?: string
  }
  shipping: OrderAddress
  tracking?: OrderTracking
  history: OrderHistory[]
  createdAt: Date
  updatedAt: Date
  assignee?: string
}

export type DateRange = '오늘' | '7일' | '30일' | '직접입력'

export interface OrderFilters {
  status: OrderStatus | '전체' | '취소·반품'
  dateRange: DateRange
  customDateStart?: string
  customDateEnd?: string
  channels: ChannelId[] | 'all'
  search?: string
  shippingMethods?: string[]
  minAmount?: number
  maxAmount?: number
  sortBy: 'latest' | 'amount_high' | 'delayed'
  assignee?: string
}
