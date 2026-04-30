'use client';

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { apiClient, localHttp } from '@/shared/api';
import type {
  ChannelApiKeys,
  Qoo10ApiKeys,
  RakutenApiKeys,
  ShopeeApiKeys,
  ShopifyApiKeys,
} from '@/shared/config';
import { credentialQueries } from './credentialQueryKeys';

export { credentialQueries };

// ─── 캐시 설정 ────────────────────────────────────────────────
const CREDENTIAL_STALE_TIME = Infinity;
const CREDENTIAL_GC_TIME = 30 * 60 * 1000;
const SHOPIFY_REFRESH_BUFFER_SEC = 5 * 60;

// ─── 타입 ─────────────────────────────────────────────────────

interface Qoo10ServerCredential {
  channelId: string;
  status: string;
  certificationKey: string;
  sellerId: string;
}

interface ShopeeServerCredential {
  channelId: string;
  partnerId: string;
  partnerKey: string;
  shopId: string;
  accessToken: string;
  refreshToken: string;
  expireIn: number;
}

interface ShopifyServerCredential {
  channelId: string;
  shopDomain: string;
  clientId: string;
  clientSecret?: string;
  accessToken: string;
  refreshToken: string;
  expireAt: number;
}

interface ShopifyRefreshApiResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ─── Shopify 토큰 갱신 ────────────────────────────────────────

async function refreshShopifyToken(current: ShopifyApiKeys): Promise<ShopifyApiKeys | null> {
  if (!current.refreshToken) return null;
  try {
    const res = await localHttp.post<ShopifyRefreshApiResponse>(
      '/api/shopify/auth/refresh',
      {
        shopDomain: current.shopDomain,
        clientId: current.clientId,
        clientSecret: current.clientSecret,
        refreshToken: current.refreshToken,
      },
    );
    const nowSec = Math.floor(Date.now() / 1000);
    const next: ShopifyApiKeys = {
      ...current,
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      expireAt: nowSec + res.expiresIn,
    };
    // 갱신된 토큰을 서버에 저장 (fire-and-forget)
    apiClient
      .put('/api/channels/shopify', {
        shopDomain: next.shopDomain,
        clientId: next.clientId,
        clientSecret: next.clientSecret,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        expireIn: res.expiresIn,
      })
      .catch(() => { /* 무시 */ });
    return next;
  } catch {
    return null;
  }
}

// ─── 채널별 credential queryFn ────────────────────────────────

async function fetchQoo10Credential(): Promise<(Qoo10ApiKeys & { channelId: string }) | null> {
  try {
    const res = await apiClient.get<Qoo10ServerCredential>('/api/channels/qoo10/credential');
    return {
      channelId: res.data.channelId,
      certificationKey: res.data.certificationKey,
      sellerId: res.data.sellerId || undefined,
    };
  } catch (err) {
    if (isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 401)) {
      return null;
    }
    throw err;
  }
}

async function fetchShopeeCredential(): Promise<(ShopeeApiKeys & { channelId: string }) | null> {
  try {
    const res = await apiClient.get<ShopeeServerCredential>('/api/channels/shopee/credential');
    return {
      channelId: res.data.channelId,
      partnerId: res.data.partnerId,
      partnerKey: res.data.partnerKey,
      shopId: res.data.shopId,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      expireAt: Math.floor(Date.now() / 1000) + res.data.expireIn,
    };
  } catch (err) {
    if (isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 401)) {
      return null;
    }
    throw err;
  }
}

async function fetchShopifyCredential(): Promise<(ShopifyApiKeys & { channelId: string }) | null> {
  try {
    const res = await apiClient.get<ShopifyServerCredential>('/api/channels/shopify/credential');
    const nowSec = Math.floor(Date.now() / 1000);
    const loaded: ShopifyApiKeys & { channelId: string } = {
      channelId: res.data.channelId,
      shopDomain: res.data.shopDomain,
      clientId: res.data.clientId,
      clientSecret: res.data.clientSecret ?? '',
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      expireAt: res.data.expireAt,
    };

    // 만료 임박 시 토큰 갱신
    const timeLeft = loaded.expireAt - nowSec;
    if (loaded.refreshToken && timeLeft <= SHOPIFY_REFRESH_BUFFER_SEC) {
      const refreshed = await refreshShopifyToken(loaded);
      return refreshed ? { ...refreshed, channelId: loaded.channelId } : loaded;
    }

    return loaded;
  } catch (err) {
    if (isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 401)) {
      return null;
    }
    throw err;
  }
}

// ─── 채널별 useQuery 훅 ───────────────────────────────────────
// TanStack Query의 deduplication으로 동일 채널을 여러 컴포넌트에서 호출해도
// 실제 네트워크 요청은 1회만 발생한다.
// enabled 옵션으로 요청한 채널만 실제 fetch하여 불필요한 네트워크 요청을 방지한다.

function useQoo10ChannelApiKey(enabled = true): {
  keys: Qoo10ApiKeys | null;
  hasKey: boolean;
  isLoading: boolean;
  saveKeys: (keys: Qoo10ApiKeys) => Promise<Qoo10ApiKeys>;
  removeKeys: () => void;
} {
  const queryClient = useQueryClient();

  const { data: keys = null, isLoading } = useQuery({
    queryKey: credentialQueries.channel('qoo10'),
    queryFn: fetchQoo10Credential,
    staleTime: CREDENTIAL_STALE_TIME,
    gcTime: CREDENTIAL_GC_TIME,
    enabled,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { mutateAsync: saveKeysMutateAsync } = useMutation({
    mutationFn: async (newKeys: Qoo10ApiKeys) => {
      await apiClient.put('/api/channels/qoo10', {
        certKey: newKeys.certificationKey,
        sellerId: newKeys.sellerId ?? '',
      });
      return newKeys;
    },
    onSuccess: (newKeys) => {
      queryClient.setQueryData(credentialQueries.channel('qoo10'), newKeys);
    },
    onError: () => {
      queryClient.setQueryData(credentialQueries.channel('qoo10'), null);
    },
  });

  const { mutate: removeKeysMutate } = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/channels/qoo10');
    },
    onSuccess: () => {
      queryClient.setQueryData(credentialQueries.channel('qoo10'), null);
    },
  });

  const saveKeys = useCallback((newKeys: Qoo10ApiKeys): Promise<Qoo10ApiKeys> => {
    return saveKeysMutateAsync(newKeys);
  }, [saveKeysMutateAsync]);

  const removeKeys = useCallback((): void => {
    removeKeysMutate();
  }, [removeKeysMutate]);

  return {
    keys,
    hasKey: keys !== null && keys.certificationKey.length > 0,
    isLoading,
    saveKeys,
    removeKeys,
  };
}

function useShopeeChannelApiKey(enabled = true): {
  keys: ShopeeApiKeys | null;
  hasKey: boolean;
  isLoading: boolean;
  saveKeys: (keys: ShopeeApiKeys) => Promise<ShopeeApiKeys>;
  removeKeys: () => void;
} {
  const queryClient = useQueryClient();

  const { data: keys = null, isLoading } = useQuery({
    queryKey: credentialQueries.channel('shopee'),
    queryFn: fetchShopeeCredential,
    staleTime: CREDENTIAL_STALE_TIME,
    gcTime: CREDENTIAL_GC_TIME,
    enabled,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { mutateAsync: saveKeysMutateAsync } = useMutation({
    mutationFn: async (newKeys: ShopeeApiKeys) => {
      await apiClient.put('/api/channels/shopee', {
        partnerId: newKeys.partnerId,
        partnerKey: newKeys.partnerKey,
        shopId: newKeys.shopId,
      });
      return newKeys;
    },
    onSuccess: (newKeys) => {
      queryClient.setQueryData(credentialQueries.channel('shopee'), newKeys);
    },
    onError: () => {
      queryClient.setQueryData(credentialQueries.channel('shopee'), null);
    },
  });

  const { mutate: removeKeysMutate } = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/channels/shopee');
    },
    onSuccess: () => {
      queryClient.setQueryData(credentialQueries.channel('shopee'), null);
    },
  });

  const saveKeys = useCallback((newKeys: ShopeeApiKeys): Promise<ShopeeApiKeys> => {
    return saveKeysMutateAsync(newKeys);
  }, [saveKeysMutateAsync]);

  const removeKeys = useCallback((): void => {
    removeKeysMutate();
  }, [removeKeysMutate]);

  return {
    keys,
    hasKey: keys !== null && keys.partnerId.length > 0 && keys.accessToken.length > 0,
    isLoading,
    saveKeys,
    removeKeys,
  };
}

function useShopifyChannelApiKey(enabled = true): {
  keys: ShopifyApiKeys | null;
  hasKey: boolean;
  isLoading: boolean;
  saveKeys: (keys: ShopifyApiKeys) => Promise<void>;
  removeKeys: () => void;
} {
  const queryClient = useQueryClient();

  const { data: keys = null, isLoading } = useQuery({
    queryKey: credentialQueries.channel('shopify'),
    queryFn: fetchShopifyCredential,
    staleTime: CREDENTIAL_STALE_TIME,
    gcTime: CREDENTIAL_GC_TIME,
    enabled,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { mutateAsync: saveKeysMutateAsync } = useMutation({
    mutationFn: async (newKeys: ShopifyApiKeys) => {
      await apiClient.put('/api/channels/shopify', {
        shopDomain: newKeys.shopDomain,
        clientId: newKeys.clientId,
        clientSecret: newKeys.clientSecret,
        accessToken: newKeys.accessToken,
        refreshToken: newKeys.refreshToken,
      });
      return newKeys;
    },
    onSuccess: (newKeys) => {
      queryClient.setQueryData(credentialQueries.channel('shopify'), newKeys);
    },
    onError: () => {
      queryClient.setQueryData(credentialQueries.channel('shopify'), null);
    },
  });

  const { mutate: removeKeysMutate } = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/channels/shopify');
    },
    onSuccess: () => {
      queryClient.setQueryData(credentialQueries.channel('shopify'), null);
    },
  });

  const saveKeys = useCallback((newKeys: ShopifyApiKeys): Promise<void> => {
    return saveKeysMutateAsync(newKeys).then(() => undefined);
  }, [saveKeysMutateAsync]);

  const removeKeys = useCallback((): void => {
    removeKeysMutate();
  }, [removeKeysMutate]);

  return {
    keys,
    hasKey: keys !== null && keys.shopDomain.length > 0 && keys.accessToken.length > 0,
    isLoading,
    saveKeys,
    removeKeys,
  };
}

// ─── Rakuten ─────────────────────────────────────────────────

interface RakutenServerCredential {
  channelId: string;
  serviceSecret: string;
  licenseKey: string;
  shopUrl: string;
}

async function fetchRakutenCredential(): Promise<(RakutenApiKeys & { channelId: string }) | null> {
  try {
    const res = await apiClient.get<RakutenServerCredential>('/api/channels/rakuten/credential');
    return {
      channelId: res.data.channelId,
      serviceSecret: res.data.serviceSecret,
      licenseKey: res.data.licenseKey,
      shopUrl: res.data.shopUrl,
    };
  } catch (err) {
    if (isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 401)) {
      return null;
    }
    throw err;
  }
}

function useRakutenChannelApiKey(enabled = true): {
  keys: RakutenApiKeys | null;
  hasKey: boolean;
  isLoading: boolean;
  saveKeys: (keys: RakutenApiKeys) => Promise<RakutenApiKeys>;
  removeKeys: () => void;
} {
  const queryClient = useQueryClient();

  const { data: keys = null, isLoading } = useQuery({
    queryKey: credentialQueries.channel('rakuten'),
    queryFn: fetchRakutenCredential,
    staleTime: CREDENTIAL_STALE_TIME,
    gcTime: CREDENTIAL_GC_TIME,
    enabled,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const { mutateAsync: saveKeysMutateAsync } = useMutation({
    mutationFn: async (newKeys: RakutenApiKeys) => {
      await apiClient.put('/api/channels/rakuten', {
        serviceSecret: newKeys.serviceSecret,
        licenseKey: newKeys.licenseKey,
        shopUrl: newKeys.shopUrl,
      });
      return newKeys;
    },
    onSuccess: (newKeys) => {
      queryClient.setQueryData(credentialQueries.channel('rakuten'), newKeys);
    },
    onError: () => {
      queryClient.setQueryData(credentialQueries.channel('rakuten'), null);
    },
  });

  const { mutate: removeKeysMutate } = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/api/channels/rakuten');
    },
    onSuccess: () => {
      queryClient.setQueryData(credentialQueries.channel('rakuten'), null);
    },
  });

  const saveKeys = useCallback((newKeys: RakutenApiKeys): Promise<RakutenApiKeys> => {
    return saveKeysMutateAsync(newKeys);
  }, [saveKeysMutateAsync]);

  const removeKeys = useCallback((): void => {
    removeKeysMutate();
  }, [removeKeysMutate]);

  return {
    keys,
    hasKey: keys !== null && keys.serviceSecret.length > 0,
    isLoading,
    saveKeys,
    removeKeys,
  };
}

// ─── 공개 API ─────────────────────────────────────────────────
// 요청한 채널만 enabled: true로 설정하여 불필요한 네트워크 요청을 방지한다.
// React 훅 규칙상 조건부 호출 불가 → 모든 훅을 호출하되 enabled 옵션으로 제어한다.
// TanStack Query deduplication으로 동일 채널은 전역에서 1회만 fetch한다.

export function useChannelApiKey<K extends keyof ChannelApiKeys>(
  channelId: K,
): {
  keys: ChannelApiKeys[K] | null;
  hasKey: boolean;
  isLoading: boolean;
  saveKeys: (keys: ChannelApiKeys[K]) => Promise<void>;
  removeKeys: () => void;
} {
  const qoo10 = useQoo10ChannelApiKey(channelId === 'qoo10');
  const rakuten = useRakutenChannelApiKey(channelId === 'rakuten');
  const shopee = useShopeeChannelApiKey(channelId === 'shopee');
  const shopify = useShopifyChannelApiKey(channelId === 'shopify');

  if (channelId === 'qoo10') {
    return qoo10 as unknown as ReturnType<typeof useChannelApiKey<K>>;
  }

  if (channelId === 'rakuten') {
    return rakuten as unknown as ReturnType<typeof useChannelApiKey<K>>;
  }

  if (channelId === 'shopee') {
    return shopee as unknown as ReturnType<typeof useChannelApiKey<K>>;
  }

  if (channelId === 'shopify') {
    return shopify as unknown as ReturnType<typeof useChannelApiKey<K>>;
  }

  return {
    keys: null,
    hasKey: false,
    isLoading: false,
    saveKeys: () => Promise.resolve(),
    removeKeys: () => { /* not implemented */ },
  };
}

// ─── 채널 UUID 조회 훅 ────────────────────────────────────────
// Fastify domain routes(/api/orders?channelId=, /api/products?channelId=) 호출 시 사용.
// 채널 타입 → UUID 매핑. credential 쿼리와 같은 queryKey를 사용하여
// 캐시된 데이터에서 channelId를 추출한다.

export function useChannelUuid(channelType: keyof ChannelApiKeys): string | null {
  const queryFn =
    channelType === 'qoo10'
      ? fetchQoo10Credential
      : channelType === 'shopee'
        ? fetchShopeeCredential
        : channelType === 'shopify'
          ? fetchShopifyCredential
          : fetchRakutenCredential;
  const { data } = useQuery<{ channelId?: string } | null>({
    queryKey: credentialQueries.channel(channelType),
    queryFn,
    staleTime: CREDENTIAL_STALE_TIME,
    gcTime: CREDENTIAL_GC_TIME,
    retry: (failureCount, error) => {
      if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 404)) {
        return false;
      }
      return failureCount < 1;
    },
  });
  return data?.channelId ?? null;
}
