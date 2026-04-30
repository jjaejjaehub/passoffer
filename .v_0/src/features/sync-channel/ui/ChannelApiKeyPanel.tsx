'use client'

import type { ChannelId } from '@/types/channel'
import { CHANNEL_CONFIG } from '@/constants/channels'
import { Card, CardContent } from '@/components/ui/card'
import { Qoo10ApiForm } from './Qoo10ApiForm'
import { RakutenApiForm } from './RakutenApiForm'
import { cn } from '@/lib/utils'

interface ChannelApiKeyPanelProps {
  channelId: ChannelId
}

const colorMap: Record<string, { bg: string; text: string }> = {
  rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
}

function ChannelPanelHeader({ channelId }: { channelId: ChannelId }) {
  const channel = CHANNEL_CONFIG[channelId]
  const colors = colorMap[channel.color] || colorMap.rose

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-10 items-center justify-center rounded-lg',
              colors.bg
            )}
          >
            <span className={cn('text-lg font-extrabold', colors.text)}>
              {channel.initial}
            </span>
          </div>
          <div className="flex flex-col items-start gap-0">
            <span className="text-lg font-bold text-slate-800">
              {channel.name}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-400" />
              <span className="text-sm text-slate-500">
                연결됨 · 마지막 확인: 2분 전
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ChannelApiKeyPanel({ channelId }: ChannelApiKeyPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <ChannelPanelHeader channelId={channelId} />
      {channelId === 'qoo10' && <Qoo10ApiForm />}
      {channelId === 'rakuten' && <RakutenApiForm />}
    </div>
  )
}
