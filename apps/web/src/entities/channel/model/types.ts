export type ChannelConnectionStatus = "connected" | "disconnected";

export interface ChannelStats {
  todayCount: number;
  monthCount: number;
  lastSyncedAt: string;
  nextSyncIn: string;
}
