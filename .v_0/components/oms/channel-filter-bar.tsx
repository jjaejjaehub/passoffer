'use client'

import { cn } from '@/lib/utils'
import type { Channel, ChannelId } from '@/types/channel'
import { CHANNEL_CONFIG } from '@/constants/channels'

interface ChannelFilterBarProps {
  channels: Channel[]
  selectedChannels: ChannelId[] | 'all'
  onSelectionChange: (selection: ChannelId[] | 'all') => void
  className?: string
}

export function ChannelFilterBar({
  channels,
  selectedChannels,
  onSelectionChange,
  className,
}: ChannelFilterBarProps) {
  const connectedChannels = channels.filter((c) => c.isConnected)
  const isAllSelected = selectedChannels === 'all'

  const handleAllClick = () => {
    onSelectionChange('all')
  }

  const handleChannelClick = (channelId: ChannelId) => {
    if (isAllSelected) {
      onSelectionChange([channelId])
    } else {
      const currentSelection = selectedChannels as ChannelId[]
      if (currentSelection.includes(channelId)) {
        const newSelection = currentSelection.filter((id) => id !== channelId)
        if (newSelection.length === 0) {
          onSelectionChange('all')
        } else {
          onSelectionChange(newSelection)
        }
      } else {
        onSelectionChange([...currentSelection, channelId])
      }
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* B&W: selected = black filled, unselected = white + border */}
      <button
        type="button"
        onClick={handleAllClick}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border',
          isAllSelected
            ? 'bg-neutral-900 text-white border-neutral-900'
            : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
        )}
      >
        전체
      </button>
      {connectedChannels.map((channel) => {
        const isSelected =
          !isAllSelected &&
          (selectedChannels as ChannelId[]).includes(channel.id)
        const config = CHANNEL_CONFIG[channel.id]
        const initial = config?.initial || channel.name[0]

        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => handleChannelClick(channel.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors border',
              isSelected
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
            )}
          >
            <span
              className={cn(
                'inline-flex items-center justify-center size-4 rounded text-[8px] font-bold border',
                isSelected
                  ? 'border-white/50 text-white'
                  : 'border-neutral-300 text-neutral-500'
              )}
            >
              {initial}
            </span>
            {channel.name}
          </button>
        )
      })}
    </div>
  )
}
