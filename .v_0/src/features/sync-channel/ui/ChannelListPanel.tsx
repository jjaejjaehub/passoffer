'use client'

import type { ChannelId } from '@/types/channel'
import { LIVE_CHANNELS, COMING_SOON_CHANNELS } from '@/constants/channels'
import { ChannelCard } from './ChannelCard'
import { Separator } from '@/components/ui/separator'

interface ChannelListPanelProps {
  selectedChannel: ChannelId
  onSelect: (id: ChannelId) => void
}

const MOCK_CHANNEL_STATS: Record<string, { todayCount: number; lastSyncedAt: string }> = {
  qoo10: { todayCount: 47, lastSyncedAt: '3분 전' },
  rakuten: { todayCount: 12, lastSyncedAt: '5분 전' },
}

export function ChannelListPanel({
  selectedChannel,
  onSelect,
}: ChannelListPanelProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mb-1 text-xs font-semibold text-slate-500">
        연결된 채널
      </span>

      {LIVE_CHANNELS.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          isSelected={selectedChannel === channel.id}
          onClick={() => onSelect(channel.id)}
          stats={MOCK_CHANNEL_STATS[channel.id]}
        />
      ))}

      <Separator className="my-3" />

      <span className="mb-1 text-xs font-semibold text-slate-400">
        추가 예정
      </span>

      {COMING_SOON_CHANNELS.map((channel) => (
        <ChannelCard
          key={channel.id}
          channel={channel}
          isSelected={selectedChannel === channel.id}
          onClick={() => onSelect(channel.id)}
        />
      ))}
    </div>
  )
}
