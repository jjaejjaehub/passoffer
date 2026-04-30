import { cn } from '@/lib/utils'
import type { Channel } from '@/types/channel'
import { CHANNEL_CONFIG } from '@/constants/channels'

interface ChannelBadgeProps {
  channel: Channel
  variant?: 'default' | 'pill' | 'icon-only'
  className?: string
}

export function ChannelBadge({
  channel,
  variant = 'default',
  className,
}: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channel.id]
  const initial = config?.initial || channel.name[0]

  // B&W: icon-only shows initial in bordered circle
  if (variant === 'icon-only') {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center size-5 rounded border border-neutral-300 text-[9px] font-bold text-neutral-600',
          className
        )}
        title={channel.name}
      >
        {initial}
      </span>
    )
  }

  // B&W: pill shows initial + name
  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
          channel.isConnected
            ? 'border-neutral-300 text-neutral-700 bg-white'
            : 'border-neutral-200 text-neutral-400 bg-neutral-50',
          className
        )}
      >
        <span className="inline-flex items-center justify-center size-4 rounded border border-neutral-300 text-[8px] font-bold">
          {initial}
        </span>
        {channel.name}
      </span>
    )
  }

  // B&W: default shows small square + name
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        channel.isConnected ? 'text-neutral-700' : 'text-neutral-400',
        className
      )}
    >
      <span className="inline-flex items-center justify-center size-4 rounded border border-neutral-300 text-[8px] font-bold text-neutral-500">
        {initial}
      </span>
      {channel.name}
    </span>
  )
}
