/**
 * credentialQueries — 서버/클라이언트 공용 query key factory
 * 'use client' 없이 두어야 serverPrefetch.ts(서버)에서도 import 가능
 */
export const credentialQueries = {
  all: () => ['credential'] as const,
  channel: (channelId: string) => ['credential', channelId] as const,
};
