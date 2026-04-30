'use client'

import { useState, useCallback } from 'react'
import type { ChannelId, OrderStatus } from '@/types/channel'
import type { CarrierId } from '@/src/entities/delivery/model/types'
import { CHANNEL_NAMES } from '@/constants/channels'
import { toast } from 'sonner'

export interface RegisterTrackingInput {
  orderId: string
  channelId: ChannelId
  carrierId: CarrierId
  trackingNumber: string
  shipDate: string
  sendToChannel: boolean
}

export interface RegisterTrackingResult {
  omsSaved: boolean
  channelSent: boolean
  newStatus: OrderStatus
}

export interface UseRegisterTracking {
  register: (input: RegisterTrackingInput) => Promise<RegisterTrackingResult>
  isLoading: boolean
  error: Error | null
}

export function useRegisterTracking(): UseRegisterTracking {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const register = useCallback(async (input: RegisterTrackingInput): Promise<RegisterTrackingResult> => {
    setIsLoading(true)
    setError(null)

    const channelName = CHANNEL_NAMES[input.channelId]

    try {
      // 1. OMS DB 저장 시뮬레이션 (300ms)
      await new Promise(resolve => setTimeout(resolve, 300))

      // 2. 채널 API 전송 시뮬레이션
      let channelSent = true
      if (input.sendToChannel) {
        // Qoo10: SetDeliveryInfo (500ms), Rakuten: shippingUpdate (700ms)
        const delay = input.channelId === 'rakuten' ? 700 : 500
        await new Promise(resolve => setTimeout(resolve, delay))

        // 15% 확률로 채널 전송 실패
        channelSent = Math.random() >= 0.15
      }

      // 3. 결과 처리
      const result: RegisterTrackingResult = {
        omsSaved: true,
        channelSent,
        newStatus: '배송중',
      }

      // 4. Toast 알림
      if (channelSent) {
        toast.success(`운송장이 등록됐고 ${channelName}에 전송됐습니다`)
      } else {
        toast.warning(
          `운송장은 저장됐으나 ${channelName} 전송에 실패했습니다. 처리 이력에서 재전송할 수 있습니다.`,
          { duration: 6000 }
        )
      }

      setIsLoading(false)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다')
      setError(error)
      setIsLoading(false)
      toast.error('운송장 등록에 실패했습니다. 다시 시도해 주세요.')
      throw error
    }
  }, [])

  return {
    register,
    isLoading,
    error,
  }
}

// Bulk registration hook
export interface BulkRegisterInput {
  items: RegisterTrackingInput[]
}

export interface BulkRegisterResult {
  successCount: number
  failedCount: number
  channelSyncFailedCount: number
  results: Array<{ orderId: string; success: boolean; channelSent: boolean }>
}

export function useBulkRegisterTracking() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const registerBulk = useCallback(async (input: BulkRegisterInput): Promise<BulkRegisterResult> => {
    setIsLoading(true)
    setError(null)

    try {
      const results: BulkRegisterResult['results'] = []

      // 일괄 처리 시뮬레이션
      for (const item of input.items) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const channelSent = Math.random() >= 0.15
        results.push({
          orderId: item.orderId,
          success: true,
          channelSent,
        })
      }

      const successCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length
      const channelSyncFailedCount = results.filter(r => r.success && !r.channelSent).length

      setIsLoading(false)
      return {
        successCount,
        failedCount,
        channelSyncFailedCount,
        results,
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다')
      setError(error)
      setIsLoading(false)
      throw error
    }
  }, [])

  return {
    registerBulk,
    isLoading,
    error,
  }
}
