export type ChannelId = 'qoo10' | 'rakuten' | 'shopee' | 'amazon' | 'shopify';

export interface Channel {
  id: ChannelId;
  name: string;
  initial: string;
  color: string;
  hex: string;
  isLive: boolean;
  currency: 'KRW' | 'JPY' | 'USD';
  region: 'KR' | 'JP' | 'US' | 'GLOBAL' | 'SEA';
  description: string;
}

export type OrderStatus =
  | '신규'
  | '처리중'
  | '배송준비'
  | '배송중'
  | '완료'
  | '취소'
  | '반품';

export const CHANNEL_CONFIG = {
  qoo10: {
    id: 'qoo10',
    name: '큐텐',
    initial: 'Q',
    color: 'neutral',
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
    color: 'neutral',
    hex: '#525252',
    isLive: true,
    currency: 'JPY',
    region: 'JP',
    description: '일본 최대 이커머스 플랫폼',
  },
  shopee: {
    id: 'shopee',
    name: '쇼피',
    initial: 'S',
    color: 'neutral',
    hex: '#EE4D2D',
    isLive: true,
    currency: 'USD',
    region: 'SEA',
    description: '동남아시아 최대 이커머스 플랫폼',
  },
  amazon: {
    id: 'amazon',
    name: '아마존',
    initial: 'A',
    color: 'neutral',
    hex: '#a3a3a3',
    isLive: false,
    currency: 'USD',
    region: 'US',
    description: '글로벌 이커머스 플랫폼',
  },
  shopify: {
    id: 'shopify',
    name: '쇼피파이',
    initial: 'SH',
    color: 'neutral',
    hex: '#96BF48',
    isLive: true,
    currency: 'USD',
    region: 'GLOBAL',
    description: '글로벌 커머스 플랫폼',
  },
} as const satisfies Record<ChannelId, Channel>;

export const LIVE_CHANNELS: Channel[] = Object.values(CHANNEL_CONFIG).filter(
  (channel) => channel.isLive,
);

export const COMING_SOON_CHANNELS: Channel[] = Object.values(
  CHANNEL_CONFIG,
).filter((channel) => !channel.isLive);

export const DEFAULT_CHANNELS = LIVE_CHANNELS;

export const CHANNEL_NAMES: Record<ChannelId, string> = {
  qoo10: '큐텐',
  rakuten: '라쿠텐',
  shopee: '쇼피',
  amazon: '아마존',
  shopify: '쇼피파이',
};

