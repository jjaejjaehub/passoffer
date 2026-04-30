'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ChannelId } from '@/shared/config';

const STORAGE_KEY = 'oms-active-channel';
const DEFAULT_CHANNEL: ChannelId = 'qoo10';

/** 앱 전역 활성 채널 컨텍스트 */
interface ActiveChannelContextType {
  activeChannel: ChannelId;
  setActiveChannel: (channel: ChannelId) => void;
}

const ActiveChannelContext = createContext<ActiveChannelContextType>({
  activeChannel: DEFAULT_CHANNEL,
  setActiveChannel: () => { /* noop */ },
});

export function ActiveChannelProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  // SSR 안전: 초기값은 항상 DEFAULT_CHANNEL, 마운트 후 localStorage 읽기
  const [activeChannel, setActiveChannelState] = useState<ChannelId>(DEFAULT_CHANNEL);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ChannelId | null;
    if (stored && (stored === 'qoo10' || stored === 'shopee' || stored === 'shopify')) {
      setActiveChannelState(stored);
    }
  }, []);

  const setActiveChannel = useCallback((channel: ChannelId) => {
    setActiveChannelState(channel);
    localStorage.setItem(STORAGE_KEY, channel);
  }, []);

  return (
    <ActiveChannelContext.Provider value={{ activeChannel, setActiveChannel }}>
      {children}
    </ActiveChannelContext.Provider>
  );
}

export function useActiveChannel(): ActiveChannelContextType {
  return useContext(ActiveChannelContext);
}
