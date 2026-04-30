'use client'

import { useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LIVE_CHANNELS } from '@/constants/channels'
import type { ChannelId } from '@/types/channel'
import type { Order, OrderStatus } from '@/src/entities/order/model/types'

type ChannelFilter = ChannelId | 'all'

const ORDER_STATUSES: OrderStatus[] = [
  '신규',
  '처리중',
  '배송준비',
  '배송중',
  '완료',
  '취소',
  '반품',
]

export function useOrderFilter(allOrders: Order[]) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read from URL
  const channelId = (searchParams.get('channel') || 'all') as ChannelFilter
  const status = searchParams.get('status') || '전체'
  const dateRange = searchParams.get('dateRange') || '7일'
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  // URL helpers
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      router.push(`/orders?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  // Channel change → reset status to '전체', page to 1
  const setChannel = useCallback(
    (id: ChannelFilter) => {
      updateUrl({
        channel: id === 'all' ? null : id,
        status: null,
        page: '1',
      })
    },
    [updateUrl]
  )

  // Status change → reset page to 1
  const setStatus = useCallback(
    (s: string) => {
      updateUrl({
        status: s === '전체' ? null : s,
        page: '1',
      })
    },
    [updateUrl]
  )

  const setDateRange = useCallback(
    (d: string) => {
      updateUrl({ dateRange: d === '7일' ? null : d })
    },
    [updateUrl]
  )

  const setSearch = useCallback(
    (s: string) => {
      updateUrl({ search: s || null, page: '1' })
    },
    [updateUrl]
  )

  const setPage = useCallback(
    (p: number) => {
      updateUrl({ page: p === 1 ? null : String(p) })
    },
    [updateUrl]
  )

  // Channel tab counts (based on all orders)
  const channelCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOrders.length }
    LIVE_CHANNELS.forEach((ch) => {
      counts[ch.id] = allOrders.filter((o) => o.channelId === ch.id).length
    })
    return counts
  }, [allOrders])

  // Status tab counts (based on selected channel)
  const statusCounts = useMemo(() => {
    const base =
      channelId === 'all'
        ? allOrders
        : allOrders.filter((o) => o.channelId === channelId)

    const counts: Record<string, number> = { '전체': base.length }
    ORDER_STATUSES.forEach((s) => {
      counts[s] = base.filter((o) => o.status === s).length
    })
    // Combine 취소·반품
    counts['취소·반품'] = (counts['취소'] || 0) + (counts['반품'] || 0)
    return counts
  }, [allOrders, channelId])

  // Final filtered orders
  const filteredOrders = useMemo(() => {
    return allOrders
      .filter((o) => channelId === 'all' || o.channelId === channelId)
      .filter((o) => {
        if (status === '전체') return true
        if (status === '취소·반품') return o.status === '취소' || o.status === '반품'
        return o.status === status
      })
      .filter((o) => {
        if (!search) return true
        const searchLower = search.toLowerCase()
        return (
          o.channelOrderId.toLowerCase().includes(searchLower) ||
          o.items[0]?.productName.toLowerCase().includes(searchLower) ||
          o.buyer.name.toLowerCase().includes(searchLower)
        )
      })
  }, [allOrders, channelId, status, search])

  return {
    channelId,
    status,
    dateRange,
    search,
    page,
    channelCounts,
    statusCounts,
    filteredOrders,
    setChannel,
    setStatus,
    setDateRange,
    setSearch,
    setPage,
  }
}
