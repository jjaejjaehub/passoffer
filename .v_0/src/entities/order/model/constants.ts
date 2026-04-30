import type { OrderStatus } from '@/types/channel'
import {
  Package,
  Loader2,
  PackageCheck,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'

// 상태 전이 맵: 각 상태에서 허용된 다음 상태들
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  신규: ['처리중', '취소'],
  처리중: ['배송준비', '취소'],
  배송준비: ['배송중', '취소'],
  배송중: ['완료', '반품'],
  완료: ['반품'],
  취소: [], // 터미널 상태
  반품: [], // 터미널 상태
}

// 터미널 상태 체크
export const isTerminalStatus = (status: OrderStatus): boolean => {
  return STATUS_TRANSITIONS[status].length === 0
}

// B&W 상태 설정: 테두리 스타일로 위계 구분
export interface StatusConfigItem {
  label: string
  colorScheme: string
  bgColor: string
  textColor: string
  borderColor: string
  borderStyle: string
  nextLabel: string // 버튼 액션 텍스트
  icon: LucideIcon
}

export const STATUS_CONFIG: Record<OrderStatus, StatusConfigItem> = {
  신규: {
    label: '신규',
    colorScheme: 'gray',
    bgColor: 'bg-neutral-900',
    textColor: 'text-white',
    borderColor: 'border-transparent',
    borderStyle: 'border',
    nextLabel: '처리 시작하기',
    icon: Package,
  },
  처리중: {
    label: '처리중',
    colorScheme: 'gray',
    bgColor: 'bg-white',
    textColor: 'text-neutral-900',
    borderColor: 'border-neutral-900',
    borderStyle: 'border',
    nextLabel: '배송 준비하기',
    icon: Loader2,
  },
  배송준비: {
    label: '배송준비',
    colorScheme: 'gray',
    bgColor: 'bg-white',
    textColor: 'text-neutral-700',
    borderColor: 'border-neutral-400',
    borderStyle: 'border',
    nextLabel: '배송 처리하기',
    icon: PackageCheck,
  },
  배송중: {
    label: '배송중',
    colorScheme: 'gray',
    bgColor: 'bg-neutral-100',
    textColor: 'text-neutral-700',
    borderColor: 'border-neutral-300',
    borderStyle: 'border',
    nextLabel: '배송 완료하기',
    icon: Truck,
  },
  완료: {
    label: '완료',
    colorScheme: 'gray',
    bgColor: 'bg-white',
    textColor: 'text-neutral-400',
    borderColor: 'border-neutral-200',
    borderStyle: 'border',
    nextLabel: '',
    icon: CheckCircle,
  },
  취소: {
    label: '취소',
    colorScheme: 'gray',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-400',
    borderColor: 'border-neutral-300',
    borderStyle: 'border-dashed',
    nextLabel: '',
    icon: XCircle,
  },
  반품: {
    label: '반품',
    colorScheme: 'gray',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-400',
    borderColor: 'border-neutral-300',
    borderStyle: 'border-dashed',
    nextLabel: '',
    icon: RotateCcw,
  },
}

// 택배사 목록
export const CARRIERS = [
  { id: 'cj', name: 'CJ대한통운' },
  { id: 'lotte', name: '롯데택배' },
  { id: 'hanjin', name: '한진택배' },
  { id: 'epost', name: '우체국택배' },
  { id: 'etc', name: '기타' },
] as const

export type CarrierId = (typeof CARRIERS)[number]['id']

// 배송 방법
export const SHIPPING_METHODS = [
  { id: 'normal', label: '일반택배' },
  { id: 'registered', label: '등기' },
  { id: 'direct', label: '직접배송' },
] as const

// 담당자 목록 (목 데이터)
export const ASSIGNEES = [
  { id: 'all', name: '전체' },
  { id: 'kim', name: '김운영' },
  { id: 'lee', name: '이수진' },
  { id: 'park', name: '박정호' },
] as const
