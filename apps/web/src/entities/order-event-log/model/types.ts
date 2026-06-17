export type OrderEventLogType =
  | "auto_match_success"
  | "auto_match_failed"
  | "duplicate_suspect"
  | "status_sync"
  | "collect_error";

export type OrderEventLogResult = "ok" | "warn" | "error";

export interface OrderEventLog {
  id: string;
  userId: string;
  channelId: string | null;
  orderId: string | null;
  orderItemId: string | null;
  eventType: OrderEventLogType;
  result: OrderEventLogResult;
  message: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
  channelName: string | null;
  channelOrderId: string | null;
}

export interface OrderEventLogsResponse {
  items: OrderEventLog[];
  nextCursor: string | null;
}

export interface OrderEventLogListFilters {
  eventType?: OrderEventLogType[];
  result?: OrderEventLogResult[];
  channelId?: string;
  orderId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  pageSize?: number;
}
