'use client'

import { useState } from 'react'
import type { ChannelId, Channel } from '@/types/channel'
import { LIVE_CHANNELS, CHANNEL_CONFIG } from '@/constants/channels'
import { AppShell } from '@/components/oms/app-shell'
import {
  ConnectedPanel,
  DisconnectedPanel,
  ComingSoonSection,
} from '@/src/features/sync-channel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

function PageHeader() {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-neutral-900">채널 관리</h1>
      <p className="mt-1 text-sm text-neutral-400">
        판매 채널을 연결하고 API 키를 관리합니다
      </p>
    </div>
  )
}

type ConnectionStatus = 'connected' | 'disconnected'

export default function ChannelsSettingsPage() {
  const [selectedTab, setSelectedTab] = useState<ChannelId>('qoo10')
  const [connectionStatus, setConnectionStatus] = useState<
    Record<ChannelId, ConnectionStatus>
  >({
    qoo10: 'connected',
    rakuten: 'disconnected',
    amazon: 'disconnected',
    shopify: 'disconnected',
  })

  const handleConnect = (channelId: ChannelId) => {
    setConnectionStatus((prev) => ({
      ...prev,
      [channelId]: 'connected',
    }))
  }

  const handleDisconnect = (channelId: ChannelId) => {
    setConnectionStatus((prev) => ({
      ...prev,
      [channelId]: 'disconnected',
    }))
  }

  return (
    <AppShell>
      <div className="h-full overflow-y-auto p-8">
        <PageHeader />

        <div className="space-y-8">
          {/* B&W Tabs for Live Channels */}
          <Tabs
            value={selectedTab}
            onValueChange={(v) => setSelectedTab(v as ChannelId)}
          >
            <TabsList className="h-auto gap-1 bg-transparent p-0 border-b border-neutral-200 rounded-none pb-px">
              {LIVE_CHANNELS.map((channel) => {
                const status = connectionStatus[channel.id]
                const isConnected = status === 'connected'
                const isSelected = selectedTab === channel.id

                return (
                  <TabsTrigger
                    key={channel.id}
                    value={channel.id}
                    className={cn(
                      'relative flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium transition-all',
                      'data-[state=active]:border-neutral-900 data-[state=active]:text-neutral-900',
                      'data-[state=inactive]:text-neutral-400 data-[state=inactive]:hover:text-neutral-700'
                    )}
                  >
                    {/* B&W: Black square for connected, gray for disconnected */}
                    <span
                      className={cn(
                        'size-1.5 rounded-[2px]',
                        isConnected ? 'bg-neutral-900' : 'bg-neutral-300'
                      )}
                    />
                    {channel.name}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {LIVE_CHANNELS.map((channel) => (
              <TabsContent
                key={channel.id}
                value={channel.id}
                className="mt-6"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${channel.id}-${connectionStatus[channel.id]}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {connectionStatus[channel.id] === 'disconnected' ? (
                      <DisconnectedPanel
                        channel={channel}
                        onConnected={() => handleConnect(channel.id)}
                      />
                    ) : (
                      <ConnectedPanel
                        channel={channel}
                        onDisconnected={() => handleDisconnect(channel.id)}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </TabsContent>
            ))}
          </Tabs>

          {/* Coming Soon Section */}
          <ComingSoonSection />
        </div>
      </div>
    </AppShell>
  )
}
