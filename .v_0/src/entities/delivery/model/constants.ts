import type { CarrierId, CarrierConfig, DeliveryStepConfig, ChannelSyncStatus } from './types'
import type { ChannelId } from '@/types/channel'

export const CARRIER_CONFIG: Record<CarrierId, CarrierConfig & { shortName: string; region: 'kr' | 'jp' }> = {
  cj: {
    name: 'CJ대한통운',
    shortName: 'CJ',
    color: 'blue',
    region: 'kr',
    trackingUrl: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=',
  },
  lotte: {
    name: '롯데택배',
    shortName: '롯데',
    color: 'red',
    region: 'kr',
    trackingUrl: 'https://www.lotteglogis.com/open/tracking?invno=',
  },
  hanjin: {
    name: '한진택배',
    shortName: '한진',
    color: 'yellow',
    region: 'kr',
    trackingUrl: 'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MNU038&schLang=KR&wblnumText2=',
  },
  epost: {
    name: '우체국택배',
    shortName: '우체국',
    color: 'orange',
    region: 'kr',
    trackingUrl: 'https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?POST_CODE=',
  },
  yamato: {
    name: 'ヤマト運輸 (야마토운수)',
    shortName: '야마토',
    color: 'green',
    region: 'jp',
    trackingUrl: 'https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?init&number=',
  },
  sagawa: {
    name: '佐川急便 (사가와큐빈)',
    shortName: '사가와',
    color: 'blue',
    region: 'jp',
    trackingUrl: 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=',
  },
  japanpost: {
    name: '日本郵便 (일본우편)',
    shortName: '일본우편',
    color: 'red',
    region: 'jp',
    trackingUrl: 'https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=',
  },
  seino: {
    name: '西濃運輸 (세이노운수)',
    shortName: '세이노',
    color: 'purple',
    region: 'jp',
    trackingUrl: 'https://track.seino.co.jp/cgi-bin/gnpquery.pgm?GNPNO1=',
  },
  etc: {
    name: '기타',
    shortName: '기타',
    color: 'gray',
    region: 'kr',
    trackingUrl: '',
  },
} as const

// 채널별 허용 택배사
export const CHANNEL_CARRIERS: Record<ChannelId, CarrierId[]> = {
  qoo10: ['cj', 'lotte', 'hanjin', 'epost', 'etc'],
  rakuten: ['yamato', 'sagawa', 'japanpost', 'seino', 'etc'],
  amazon: ['cj', 'lotte', 'hanjin', 'epost', 'yamato', 'sagawa', 'japanpost', 'seino', 'etc'],
  shopify: ['cj', 'lotte', 'hanjin', 'epost', 'yamato', 'sagawa', 'japanpost', 'seino', 'etc'],
} as const

export const DELIVERY_STEPS: DeliveryStepConfig[] = [
  { key: 'pickup', label: '집화완료' },
  { key: 'transit', label: '간선이동 중' },
  { key: 'arrived', label: '배송센터 도착' },
  { key: 'out', label: '배송 출발' },
  { key: 'delivered', label: '배송 완료' },
] as const

export const SYNC_STATUS_CONFIG: Record<ChannelSyncStatus, { label: string; color: string; bgColor: string; textColor: string }> = {
  success: {
    label: '전송 완료',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
  },
  failed: {
    label: '전송 실패',
    color: 'red',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
  },
  pending: {
    label: '전송 중',
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
  },
  not_sent: {
    label: '미전송',
    color: 'gray',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-500',
  },
} as const

// 송장번호 포맷팅 함수
export function formatTrackingNumber(value: string, carrierId: CarrierId): string {
  const digits = value.replace(/\D/g, '')
  
  // 우체국: XXX-XXXX-XXXX (3-4-4)
  if (carrierId === 'epost' || carrierId === 'seino') {
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
  
  // 기타: 자유 형식 (숫자만)
  if (carrierId === 'etc') {
    return digits
  }
  
  // CJ/롯데/한진/야마토/사가와/일본우편: XXXX-XXXX-XXXX (4-4-4)
  if (digits.length <= 4) return digits
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`
}

// 송장번호 유효성 검사
export function validateTrackingNumber(value: string, carrierId: CarrierId): boolean {
  const digits = value.replace(/\D/g, '')
  
  if (carrierId === 'epost' || carrierId === 'seino') {
    return digits.length >= 11 && digits.length <= 13
  }
  
  if (carrierId === 'etc') {
    return digits.length >= 8
  }
  
  // CJ/롯데/한진/야마토/사가와/일본우편
  return digits.length >= 10 && digits.length <= 14
}

// 송장번호 플레이스홀더
export function getTrackingPlaceholder(carrierId: CarrierId): string {
  if (carrierId === 'epost' || carrierId === 'seino') {
    return '예: 123-4567-8901 (11자리)'
  }
  if (carrierId === 'etc') {
    return '운송장 번호 입력'
  }
  return '예: 1234-5678-9012 (12자리)'
}

// 택배사 옵션 목록
export const CARRIER_OPTIONS = Object.entries(CARRIER_CONFIG).map(([id, config]) => ({
  id: id as CarrierId,
  name: config.name,
  shortName: config.shortName,
  color: config.color,
  region: config.region,
}))

// 국내/일본 택배사 그룹
export const KR_CARRIERS = CARRIER_OPTIONS.filter(c => c.region === 'kr' && c.id !== 'etc')
export const JP_CARRIERS = CARRIER_OPTIONS.filter(c => c.region === 'jp')
export const ETC_CARRIERS = CARRIER_OPTIONS.filter(c => c.id === 'etc')
