'use client'

import { cn } from '@/lib/utils'
import type { Channel } from '@/types/channel'
import { Badge } from '@/components/ui/badge'

interface ChannelCardProps {
  channel: Channel
  isSelected: boolean
  onClick: () => void
  stats?: {
    todayCount: number
    lastSyncedAt: string
  }
}

const colorMap: Record<string, { bg: string; border: string; text: string; indicator: string; dot: string }> = {
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-400',
    text: 'text-rose-600',
    indicator: 'bg-rose-500',
    dot: 'bg-rose-100',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    text: 'text-orange-600',
    indicator: 'bg-orange-500',
    dot: 'bg-orange-100',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-600',
    indicator: 'bg-amber-500',
    dot: 'bg-amber-100',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    text: 'text-green-600',
    indicator: 'bg-green-500',
    dot: 'bg-green-100',
  },
}

export function ChannelCard({
  channel,
  isSelected,
  onClick,
  stats,
}: ChannelCardProps) {
  const colors = colorMap[channel.color] || colorMap.rose

  if (!channel.isLive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border-[1.5px] border-dashed p-3 text-left transition-all',
          'border-slate-200 bg-white opacity-50',
          isSelected && 'border-slate-300 bg-slate-50 opacity-70'
        )}
      >
        {/* Selection indicator */}
        <div
          className={cn(
            'absolute bottom-0 left-0 top-0 w-[3px] transition-colors',
            isSelected ? 'bg-slate-400' : 'bg-transparent'
          )}
        />

        <div
          className={cn(
            'flex items-center gap-3 transition-all',
            isSelected ? 'pl-2' : 'pl-0'
          )}
        >
          {/* Initial box */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
            <span className="text-sm font-extrabold text-slate-400">
              {channel.initial}
            </span>
          </div>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-slate-500">
                {channel.name}
              </span>
              <Badge variant="outline" className="text-[10px] px-1.5 text-slate-400 border-slate-300">
                준비 중
              </Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-slate-300" />
              <span className="truncate text-xs text-slate-400">
                Phase 2 출시 예정
              </span>
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full overflow-hidden rounded-xl border-[1.5px] p-3 text-left transition-all',
        isSelected
          ? cn(colors.border, colors.bg)
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute bottom-0 left-0 top-0 w-[3px] transition-colors',
          isSelected ? colors.indicator : 'bg-transparent'
        )}
      />

      <div
        className={cn(
          'flex items-center gap-3 transition-all',
          isSelected ? 'pl-2' : 'pl-0'
        )}
      >
        {/* Initial box */}
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            colors.dot
          )}
        >
          <span className={cn('text-sm font-extrabold', colors.text)}>
            {channel.initial}
          </span>
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col items-start gap-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-800">
              {channel.name}
            </span>
            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 hover:bg-green-100">
              연결됨
            </Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-green-400" />
            <span className="truncate text-xs text-slate-500">
              {stats
                ? `${stats.lastSyncedAt} · 오늘 ${stats.todayCount}건`
                : '연결됨'}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
