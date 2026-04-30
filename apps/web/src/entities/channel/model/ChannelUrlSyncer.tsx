'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ChannelId } from '@/shared/config';
import { useActiveChannel } from './ActiveChannelContext';

const VALID_CHANNELS: ChannelId[] = ['qoo10', 'rakuten', 'shopee', 'amazon', 'shopify'];

function isValidChannel(value: string): value is ChannelId {
  return VALID_CHANNELS.includes(value as ChannelId);
}

/**
 * URL의 ?channel= 파라미터와 ActiveChannelContext를 양방향 동기화한다.
 * - URL → Context: 마운트/URL 변경 시 channel 파라미터를 컨텍스트에 반영
 * - Context → URL: activeChannel 변경 시 URL에 반영 (scroll 없이 replace)
 *
 * AppShell 내부 Suspense로 감싸서 사용한다.
 */
export function ChannelUrlSyncer(): null {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { activeChannel, setActiveChannel } = useActiveChannel();

  // URL → Context
  useEffect(() => {
    const param = searchParams?.get('channel');
    if (param && isValidChannel(param) && param !== activeChannel) {
      setActiveChannel(param);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Context → URL
  // URL에 ?channel= 파라미터가 이미 있을 때만 동기화한다.
  // 없으면 추가하지 않는다 — 불필요한 router.replace와 재렌더링을 방지한다.
  useEffect(() => {
    const current = searchParams?.get('channel');
    if (!current) return; // ?channel= 없으면 URL에 추가하지 않음
    if (current === activeChannel) return;

    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('channel', activeChannel);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  return null;
}
