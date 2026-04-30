import type { Channel, ChannelId, OrderStatus } from '@/types/channel'

export const CHANNEL_CONFIG: Record<ChannelId, Channel> = {
  qoo10: {
    id: 'qoo10',
    name: '큐텐',
    initial: 'Q',
    color: 'neutral', // B&W: no color
    hex: '#525252',
    isLive: true,
    currency: 'KRW',
    region: 'KR',
    description: '한국·싱가포르·인도네시아 이커머스',
  },
  rakuten: {
    id: 'rakuten',
    name: '라쿠텐',
    initial: 'R',
    color: 'neutral', // B&W: no color
    hex: '#525252',
    isLive: true,
    currency: 'JPY',
    region: 'JP',
    description: '일본 최대 이커머스 플랫폼',
  },
  amazon: {
    id: 'amazon',
    name: '아마존',
    initial: 'A',
    color: 'neutral', // B&W: no color
    hex: '#a3a3a3',
    isLive: false,
    currency: 'USD',
    region: 'US',
    description: '글로벌 이커머스 플랫폼',
  },
  shopify: {
    id: 'shopify',
    name: '쇼피파이',
    initial: 'S',
    color: 'neutral', // B&W: no color
    hex: '#a3a3a3',
    isLive: false,
    currency: 'USD',
    region: 'GLOBAL',
    description: '글로벌 커머스 플랫폼',
  },
}

export const LIVE_CHANNELS = Object.values(CHANNEL_CONFIG).filter(
  (c) => c.isLive
)
export const COMING_SOON_CHANNELS = Object.values(CHANNEL_CONFIG).filter(
  (c) => !c.isLive
)

// Alias for backward compatibility
export const DEFAULT_CHANNELS = LIVE_CHANNELS

export const CHANNEL_NAMES: Record<ChannelId, string> = {
  qoo10: '큐텐',
  rakuten: '라쿠텐',
  amazon: '아마존',
  shopify: '쇼피파이',
}

// B&W: all channel colors are neutral
export const CHANNEL_COLORS: Record<ChannelId, string> = {
  qoo10: 'bg-neutral-500',
  rakuten: 'bg-neutral-500',
  amazon: 'bg-neutral-400',
  shopify: 'bg-neutral-400',
}

export function getChannelById(id: ChannelId): Channel {
  return CHANNEL_CONFIG[id]
}

// B&W: all status colors are gray scale with border differentiation
export const STATUS_CONFIG: Record<
  OrderStatus,
  { color: string; bgColor: string; textColor: string }
> = {
  신규: {
    color: 'neutral',
    bgColor: 'bg-neutral-900',
    textColor: 'text-white',
  },
  처리중: {
    color: 'neutral',
    bgColor: 'bg-white',
    textColor: 'text-neutral-900',
  },
  배송준비: {
    color: 'neutral',
    bgColor: 'bg-white',
    textColor: 'text-neutral-700',
  },
  배송중: {
    color: 'neutral',
    bgColor: 'bg-neutral-100',
    textColor: 'text-neutral-700',
  },
  완료: {
    color: 'neutral',
    bgColor: 'bg-white',
    textColor: 'text-neutral-400',
  },
  취소: {
    color: 'neutral',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-400',
  },
  반품: {
    color: 'neutral',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-400',
  },
}
