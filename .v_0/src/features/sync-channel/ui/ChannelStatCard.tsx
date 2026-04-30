'use client'

import { useState, useEffect } from 'react'
import type { ChannelId } from '@/types/channel'
import { CHANNEL_CONFIG } from '@/constants/channels'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, History, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ChannelStatCardProps {
  channelId: ChannelId
}

const MOCK_STATS: Record<
  string,
  {
    todayCount: number
    monthCount: number
    lastSyncedAt: string
    nextSyncIn: string
  }
> = {
  qoo10: {
    todayCount: 47,
    monthCount: 1247,
    lastSyncedAt: '3분 전',
    nextSyncIn: '2분 후',
  },
  rakuten: {
    todayCount: 12,
    monthCount: 384,
    lastSyncedAt: '5분 전',
    nextSyncIn: '0분 후',
  },
}

const colorMap: Record<string, string> = {
  rose: 'text-rose-600',
  orange: 'text-orange-600',
  amber: 'text-amber-600',
  green: 'text-green-600',
}

function CountUpText({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    const duration = 600
    const start = Date.now()
    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value])

  return <span className={className}>{display.toLocaleString('ko-KR')}</span>
}

function StatBox({
  label,
  value,
  unit,
  color,
  isText = false,
}: {
  label: string
  value: number | string
  unit?: string
  color?: string
  isText?: boolean
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      {isText ? (
        <p className="text-base font-semibold text-slate-700">{value}</p>
      ) : (
        <div className="flex items-baseline gap-0.5">
          <CountUpText
            value={value as number}
            className={cn('text-xl font-bold', color || 'text-slate-700')}
          />
          {unit && <span className="text-xs text-slate-500">{unit}</span>}
        </div>
      )}
    </div>
  )
}

export function ChannelStatCard({ channelId }: ChannelStatCardProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()
  const channel = CHANNEL_CONFIG[channelId]
  const stats = MOCK_STATS[channelId]
  const textColor = colorMap[channel.color] || 'text-slate-700'

  const handleSync = async () => {
    setIsSyncing(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsSyncing(false)
    toast({
      title: '수집을 시작했습니다',
      description: `${channel.name} 주문을 수집하고 있습니다.`,
    })
  }

  const handleHistory = () => {
    toast({
      title: '준비 중인 기능입니다',
      description: '수집 이력 기능은 곧 제공될 예정입니다.',
      variant: 'default',
    })
  }

  if (!stats) return null

  return (
    <div className="flex flex-col gap-0">
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-semibold text-slate-800">수집 현황</span>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              자동 수집 중
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <StatBox
              label="오늘 수집"
              value={stats.todayCount}
              unit="건"
              color={textColor}
            />
            <StatBox
              label="이번 달 수집"
              value={stats.monthCount}
              unit="건"
              color="text-slate-600"
            />
            <StatBox
              label="마지막 수집"
              value={stats.lastSyncedAt}
              isText
            />
            <StatBox label="다음 수집" value={stats.nextSyncIn} isText />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-t-none border-t-0">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              {isSyncing ? '수집 중...' : '지금 수집하기'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500"
              onClick={handleHistory}
            >
              <History className="mr-2 size-4" />
              수집 이력
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
