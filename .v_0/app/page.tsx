'use client'

import { useState } from 'react'
import {
  ShoppingCart,
  Truck,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { AppShell, ChannelFilterBar, StatusBadge, EmptyState } from '@/components/oms'
import { DEFAULT_CHANNELS, CHANNEL_CONFIG } from '@/constants/channels'
import type { ChannelId, OrderStatus } from '@/types/channel'

// B&W stats card data - all icons use neutral colors
const stats = [
  {
    title: '오늘 신규 주문',
    value: '₩2,340,000',
    count: '12건',
    trend: 8.2,
    icon: ShoppingCart,
  },
  {
    title: '처리 대기',
    value: '₩890,000',
    count: '5건',
    trend: -2.1,
    icon: Package,
  },
  {
    title: '배송 중',
    value: '₩1,560,000',
    count: '8건',
    trend: 12.5,
    icon: Truck,
  },
  {
    title: '이번 달 매출',
    value: '₩45,230,000',
    count: '234건',
    trend: 15.3,
    icon: TrendingUp,
  },
]

// 예시 최근 주문 데이터
const recentOrders: {
  id: string
  orderNumber: string
  customer: string
  channel: ChannelId
  status: OrderStatus
  amount: string
  date: string
}[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001234',
    customer: '김철수',
    channel: 'qoo10',
    status: '신규',
    amount: '₩156,000',
    date: '2024.01.15 오전 9:32',
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-001233',
    customer: '이영희',
    channel: 'qoo10',
    status: '처리중',
    amount: '₩89,000',
    date: '2024.01.15 오전 9:15',
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-001232',
    customer: '박민수',
    channel: 'qoo10',
    status: '배송준비',
    amount: '₩234,000',
    date: '2024.01.15 오전 8:45',
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-001231',
    customer: '정수현',
    channel: 'qoo10',
    status: '배송중',
    amount: '₩67,000',
    date: '2024.01.14 오후 4:22',
  },
  {
    id: '5',
    orderNumber: 'ORD-2024-001230',
    customer: '최지은',
    channel: 'qoo10',
    status: '완료',
    amount: '₩128,000',
    date: '2024.01.14 오후 2:10',
  },
]

export default function DashboardPage() {
  const [selectedChannels, setSelectedChannels] = useState<ChannelId[] | 'all'>('all')

  return (
    <AppShell channels={DEFAULT_CHANNELS}>
      <div className="p-8 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">대시보드</h1>
          <p className="mt-1 text-sm text-neutral-400">
            오늘의 주문 현황과 주요 지표를 확인하세요.
          </p>
        </div>

        {/* Channel filter */}
        <ChannelFilterBar
          channels={DEFAULT_CHANNELS}
          selectedChannels={selectedChannels}
          onSelectionChange={setSelectedChannels}
        />

        {/* B&W Stats cards - uniform gray style */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            const isPositive = stat.trend > 0

            return (
              <div
                key={stat.title}
                className="rounded-lg border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  {/* B&W: All icons use neutral background */}
                  <div className="rounded-lg bg-neutral-100 p-2.5">
                    <Icon className="size-5 text-neutral-600" />
                  </div>
                  {/* B&W: Trends use neutral colors, no red/green */}
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isPositive ? 'text-neutral-900' : 'text-neutral-400'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                    {isPositive ? '+' : ''}
                    {Math.abs(stat.trend)}%
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-neutral-400">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-neutral-400">{stat.count}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent orders - B&W table */}
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-medium text-neutral-900">최근 주문</h2>
          </div>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500">
                      주문번호
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500">
                      고객명
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500">
                      채널
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-neutral-500">
                      상태
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium text-neutral-500">
                      금액
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-medium text-neutral-500">
                      주문일시
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const channel = DEFAULT_CHANNELS.find(
                      (c) => c.id === order.channel
                    )
                    const config = channel ? CHANNEL_CONFIG[channel.id] : null

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="px-5 py-3 font-medium text-neutral-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-5 py-3 text-neutral-600">
                          {order.customer}
                        </td>
                        <td className="px-5 py-3">
                          {channel && config && (
                            <span className="inline-flex items-center gap-1.5 text-neutral-600">
                              {/* B&W: Channel initial in small bordered box */}
                              <span className="inline-flex items-center justify-center size-4 rounded border border-neutral-300 text-[8px] font-bold text-neutral-500">
                                {config.initial}
                              </span>
                              {channel.name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-neutral-900">
                          {order.amount}
                        </td>
                        <td className="px-5 py-3 text-right text-neutral-500">
                          {order.date}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="조건에 맞는 주문이 없습니다"
              description="선택한 채널에서 들어온 주문이 아직 없습니다."
              action={{
                label: '채널 연결하기',
                onClick: () => {},
              }}
            />
          )}
        </div>
      </div>
    </AppShell>
  )
}
