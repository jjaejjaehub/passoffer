import type { ChannelApiKeys } from "@/shared/config";

export type {
  Qoo10ApiKeys,
  RakutenApiKeys,
  ShopeeApiKeys,
  ShopifyApiKeys,
  ChannelApiKeys,
} from "@/shared/config";

const STORAGE_KEY = "oms_channel_api_keys" as const;

interface ChannelKeyStorage {
  get<K extends keyof ChannelApiKeys>(channelId: K): ChannelApiKeys[K] | null;
  set<K extends keyof ChannelApiKeys>(
    channelId: K,
    keys: ChannelApiKeys[K],
  ): void;
  remove(channelId: keyof ChannelApiKeys): void;
  clear(): void;
}

function readFromStorage(): ChannelApiKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ChannelApiKeys;
  } catch {
    return {};
  }
}

function writeToStorage(data: ChannelApiKeys): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 용량 초과 등은 무시
  }
}

export const channelKeyStorage: ChannelKeyStorage = {
  get(channelId) {
    const data = readFromStorage();
    return (data[channelId] ?? null) as ChannelApiKeys[typeof channelId] | null;
  },
  set(channelId, keys) {
    const data = readFromStorage();
    writeToStorage({ ...data, [channelId]: keys });
  },
  remove(channelId) {
    const data = readFromStorage();
    delete data[channelId];
    writeToStorage(data);
  },
  clear() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },
};
