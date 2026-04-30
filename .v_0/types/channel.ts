export type ChannelId = 'qoo10' | 'rakuten' | 'amazon' | 'shopify'

export interface Channel {
  id: ChannelId
  name: string
  initial: string
  color: string
  hex: string
  isLive: boolean
  currency: 'KRW' | 'JPY' | 'USD'
  region: 'KR' | 'JP' | 'US' | 'GLOBAL'
  description: string
}

export type OrderStatus =
  | '신규'
  | '처리중'
  | '배송준비'
  | '배송중'
  | '완료'
  | '취소'
  | '반품'
